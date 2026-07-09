"""Extraction pipeline + in-memory job manager.

Flow (per uploaded PDF):
  1. render each page → PNG
  2. Claude Vision → questions per page (concurrent, bounded)
  3. merge by questionNumber
  4. Claude (text) enrichment → subject/topic/difficulty/explanation (batched)

Job state lives in memory and is polled by the frontend, which then writes the
final questions to Firestore with the admin's own credentials. This keeps the
Railway backend stateless-ish and needs no Firebase service account.
"""
from __future__ import annotations

import json
import threading
import concurrent.futures as cf

from .config import settings
from .sap import sap
from . import pdfrender, prompts
from .schemas import JobStatus, Question, Option

# jobId -> JobStatus
_jobs: dict[str, JobStatus] = {}
_jobs_lock = threading.Lock()


def get_job(job_id: str) -> JobStatus | None:
    with _jobs_lock:
        return _jobs.get(job_id)


def _set(job: JobStatus, **kw) -> None:
    with _jobs_lock:
        for k, v in kw.items():
            setattr(job, k, v)


def _parse_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.lstrip().lower().startswith("json"):
            raw = raw.lstrip()[4:]
    return json.loads(raw)


def _coerce_qnum(n) -> int | None:
    """Question numbers sometimes come back as strings ("1") — normalise to int."""
    if isinstance(n, bool):
        return None
    if isinstance(n, int):
        return n
    if isinstance(n, str) and n.strip().isdigit():
        return int(n.strip())
    return None


def _extract_page_group(doc, page_indices: list[int], qnums: list[int]) -> list[dict]:
    """Extract questions from one or more consecutive pages that belong together."""
    if not qnums or not page_indices:
        return []
    # Telugu is token-heavy; give a generous budget per expected question so a long
    # bilingual page never gets its JSON truncated (a truncated response fails to
    # parse and silently drops every question on the page).
    budget = max(3000, 1400 * len(qnums)) + 600 * (len(page_indices) - 1)
    if len(page_indices) == 1:
        img = pdfrender.render_page_png_b64(doc, page_indices[0])
        raw = sap.vision(
            prompts.EXTRACT_SYSTEM,
            prompts.extract_user_prompt(qnums),
            img,
            max_tokens=budget,
            temperature=0.0,
        )
    else:
        labels = prompts.extract_user_prompt_multipage(qnums, len(page_indices))
        pages = [
            (labels[i], pdfrender.render_page_png_b64(doc, page_indices[i]))
            for i in range(len(page_indices))
        ]
        raw = sap.vision_multi(
            prompts.EXTRACT_SYSTEM,
            pages,
            max_tokens=budget,
            temperature=0.0,
        )
    try:
        data = _parse_json(raw)
        return data.get("questions", [])
    except Exception:
        return []


def _extract_single_question(doc, page_index: int, qnum: int) -> list[dict]:
    """Focused re-extraction of ONE question the first pass missed.

    Reruns the page alone with a prompt that names the specific question and a
    large token budget, so a question the model skipped (or a page whose JSON was
    truncated) gets a second, isolated chance.
    """
    img = pdfrender.render_page_png_b64(doc, page_index)
    raw = sap.vision(
        prompts.EXTRACT_SYSTEM,
        prompts.extract_single_question_prompt(qnum),
        img,
        max_tokens=3500,
        temperature=0.0,
    )
    try:
        return _parse_json(raw).get("questions", [])
    except Exception:
        return []


def _enrich(questions: list[Question], job: "JobStatus | None" = None) -> None:
    """Batch-classify questions and attach explanations, in place.

    If a job is given, report progress after every batch so the UI can show a
    real progress bar (this phase makes several slow LLM calls, one per batch).
    """
    BATCH = 12
    if job is not None:
        _set(job, enrichTotal=len(questions), enrichDone=0)
    for start in range(0, len(questions), BATCH):
        batch = questions[start:start + BATCH]
        payload = [
            {
                "id": q.id,
                "subjectHint": prompts.subject_for_qnum(q.questionNumber),
                "englishQuestion": q.englishQuestion,
                "teluguQuestion": q.teluguQuestion,
                "options": [o.model_dump() for o in q.options],
                "correctOption": q.correctOption,
            }
            for q in batch
        ]
        try:
            raw = sap.chat(
                prompts.ENRICH_SYSTEM,
                prompts.enrich_user_prompt(json.dumps(payload, ensure_ascii=False)),
                max_tokens=3000,
                temperature=0.2,
            )
            items = {it["id"]: it for it in _parse_json(raw).get("items", [])}
        except Exception:
            items = {}
        for q in batch:
            it = items.get(q.id, {})
            q.subject = it.get("subject") or prompts.subject_for_qnum(q.questionNumber)
            q.topic = it.get("topic", "")
            q.difficulty = it.get("difficulty", "medium")
            q.explanation = it.get("explanation", "")
            q.explanationTelugu = it.get("explanationTelugu", "")
        if job is not None:
            _set(job, enrichDone=min(start + BATCH, len(questions)))


def _compute_stats(questions: list[Question]) -> dict:
    by_subject: dict[str, int] = {}
    by_difficulty = {"easy": 0, "medium": 0, "hard": 0}
    answered = 0
    for q in questions:
        by_subject[q.subject] = by_subject.get(q.subject, 0) + 1
        if q.difficulty in by_difficulty:
            by_difficulty[q.difficulty] += 1
        if q.correctOption:
            answered += 1
    return {
        "total": len(questions),
        "bySubject": by_subject,
        "byDifficulty": by_difficulty,
        "withAnswer": answered,
    }


def run_extraction(job_id: str, pdf_bytes: bytes, file_name: str) -> None:
    """Executed in a background thread. Updates the job as it progresses."""
    job = JobStatus(jobId=job_id, status="rendering", fileName=file_name)
    with _jobs_lock:
        _jobs[job_id] = job
    try:
        doc = pdfrender.open_pdf(pdf_bytes)
        total = doc.page_count
        _set(job, totalPages=total, status="extracting",
             message="Grouping pages and reading questions…")

        # Pre-pass: find question numbers in each page's text layer (fast, no LLM).
        page_qnums = [pdfrender.page_question_numbers(doc, i) for i in range(total)]

        # Group pages: a page with question numbers starts a new group; a page
        # with no question numbers is a continuation of the previous group.
        # key = first page index of the group, value = (page_indices, qnums).
        groups: list[tuple[list[int], list[int]]] = []
        for i in range(total):
            if page_qnums[i]:
                groups.append(([i], page_qnums[i]))
            elif groups:
                groups[-1][0].append(i)
            # else: pages before the first question (cover/instructions) — skip

        page_results: dict[int, list[dict]] = {}
        done = 0
        with cf.ThreadPoolExecutor(max_workers=settings.VISION_CONCURRENCY) as ex:
            futures = {
                ex.submit(_extract_page_group, doc, g_pages, g_qnums): g_pages[0]
                for g_pages, g_qnums in groups
            }
            for fut in cf.as_completed(futures):
                key = futures[fut]
                try:
                    page_results[key] = fut.result()
                except Exception:
                    page_results[key] = []
                done += 1
                found = sum(len(v) for v in page_results.values())
                _set(job, pagesDone=done, questionsFound=found)

        # Merge by questionNumber (first non-empty wins; keep stable order).
        merged: dict[int, dict] = {}
        for i in sorted(page_results):
            for q in page_results[i]:
                n = _coerce_qnum(q.get("questionNumber"))
                if n is not None and n not in merged:
                    merged[n] = q

        # ── Validation & recovery ─────────────────────────────────────────────
        # The text layer tells us EVERY question number the paper contains, so we
        # know exactly which ones the vision model dropped. Re-extract the missing
        # ones (one page at a time, focused prompt) and repeat until nothing is
        # missing or we hit the round cap. This guarantees all 150 are captured
        # instead of silently settling for 146.
        expected: dict[int, int] = {}  # qnum -> first page index it appears on
        for i, nums in enumerate(page_qnums):
            for n in nums:
                expected.setdefault(n, i)

        MAX_RECOVERY_ROUNDS = 4
        for _round in range(MAX_RECOVERY_ROUNDS):
            missing = sorted(set(expected) - set(merged))
            if not missing:
                break
            _set(job, status="extracting",
                 message=f"Recovering {len(missing)} missing question(s) "
                         f"(round {_round + 1})…")
            recovered = 0
            for n in missing:
                try:
                    for q in _extract_single_question(doc, expected[n], n):
                        m = _coerce_qnum(q.get("questionNumber"))
                        if m is not None and m not in merged:
                            merged[m] = q
                            recovered += 1
                except Exception:
                    continue
                _set(job, questionsFound=len(merged))
            # No progress this round → further identical retries won't help; stop.
            if recovered == 0:
                break

        still_missing = sorted(set(expected) - set(merged))

        questions: list[Question] = []
        for n in sorted(merged):
            q = merged[n]
            opts = [
                Option(index=o.get("index", k + 1),
                       english=o.get("english", "") or "",
                       telugu=o.get("telugu", "") or "")
                for k, o in enumerate(q.get("options", [])[:4])
            ]
            questions.append(Question(
                id=f"q{n}",
                questionNumber=n,
                englishQuestion=q.get("englishQuestion", "") or "",
                teluguQuestion=q.get("teluguQuestion", "") or "",
                options=opts,
                correctOption=q.get("correctOption"),
                hasDiagram=bool(q.get("hasDiagram", False)),
            ))

        _set(job, status="enriching", questionsFound=len(questions),
             message="Tagging subject, topic, difficulty & writing explanations…")
        _enrich(questions, job)

        expected_total = len(expected)
        if still_missing:
            msg = (f"Extracted {len(questions)} of {expected_total} questions. "
                   f"Could not read Q{', Q'.join(map(str, still_missing))} after "
                   "several retries — please check those pages in the PDF.")
        else:
            msg = f"Extracted all {len(questions)} questions."
        _set(job, status="done", questions=questions,
             stats=_compute_stats(questions),
             message=msg)
    except Exception as e:  # noqa: BLE001 — surface any failure to the UI
        _set(job, status="error", error=str(e), message="Extraction failed.")
