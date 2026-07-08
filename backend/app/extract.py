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


def _extract_page(doc, page_index: int) -> list[dict]:
    qnums = pdfrender.page_question_numbers(doc, page_index)
    if not qnums:
        return []  # divider / instruction page — nothing to extract
    img = pdfrender.render_page_png_b64(doc, page_index)
    raw = sap.vision(
        prompts.EXTRACT_SYSTEM,
        prompts.extract_user_prompt(qnums),
        img,
        max_tokens=2200,
        temperature=0.0,
    )
    try:
        data = _parse_json(raw)
        return data.get("questions", [])
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
             message="Reading questions from each page…")

        page_results: dict[int, list[dict]] = {}
        done = 0
        with cf.ThreadPoolExecutor(max_workers=settings.VISION_CONCURRENCY) as ex:
            futures = {ex.submit(_extract_page, doc, i): i for i in range(total)}
            for fut in cf.as_completed(futures):
                i = futures[fut]
                try:
                    page_results[i] = fut.result()
                except Exception:
                    page_results[i] = []
                done += 1
                found = sum(len(v) for v in page_results.values())
                _set(job, pagesDone=done, questionsFound=found)

        # Merge by questionNumber (first non-empty wins; keep stable order).
        merged: dict[int, dict] = {}
        for i in sorted(page_results):
            for q in page_results[i]:
                n = q.get("questionNumber")
                if isinstance(n, int) and n not in merged:
                    merged[n] = q

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

        _set(job, status="done", questions=questions,
             stats=_compute_stats(questions),
             message=f"Extracted {len(questions)} questions.")
    except Exception as e:  # noqa: BLE001 — surface any failure to the UI
        _set(job, status="error", error=str(e), message="Extraction failed.")
