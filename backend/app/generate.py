"""Daily-paper generation pipeline.

Flow:
  1. build a 150-slot blueprint (subject/topic/difficulty/source) — see blueprint.py
  2. fill 'bank' slots from previous-year questions supplied by the frontend
  3. generate 'ai' slots with Claude, batched per subject
  4. de-duplicate: any generated question too similar to another (or to the bank)
     is regenerated (up to 2 tries); still-similar ones are flagged
  5. compute stats

Generation jobs are polled by the frontend, which posts the final paper to
Firestore. No Firestore access from the backend.
"""
from __future__ import annotations

import re
import json
import threading
import concurrent.futures as cf

from .config import settings
from .sap import sap
from . import blueprint, genprompts
from .schemas import JobStatus, Question, Option

_gen_jobs: dict[str, JobStatus] = {}
_lock = threading.Lock()

DUP_THRESHOLD = 0.6
BATCH_SPECS = 8


def get_gen_job(job_id: str) -> JobStatus | None:
    with _lock:
        return _gen_jobs.get(job_id)


def _set(job: JobStatus, **kw):
    with _lock:
        for k, v in kw.items():
            setattr(job, k, v)


def _parse(raw: str) -> dict:
    raw = (raw or "").strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.lstrip().lower().startswith("json"):
            raw = raw.lstrip()[4:]
    return json.loads(raw)


def _stem(q) -> str:
    """Text used for duplicate comparison: English stem, else Telugu."""
    if isinstance(q, dict):
        return q.get("englishQuestion") or q.get("teluguQuestion") or ""
    return q.englishQuestion or q.teluguQuestion or ""


def _tokens(s: str) -> set:
    return set(re.findall(r"[a-z0-9ఀ-౿]+", (s or "").lower()))


def _similarity(a: str, b: str) -> float:
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def _max_sim(text: str, others: list[str]) -> float:
    return max((_similarity(text, o) for o in others), default=0.0)


def _to_question(raw: dict, qnum: int, subject: str, topic: str, difficulty: str,
                 source: str) -> Question:
    opts = [
        Option(index=o.get("index", k + 1),
               english=o.get("english", "") or "",
               telugu=o.get("telugu", "") or "")
        for k, o in enumerate((raw.get("options") or [])[:4])
    ]
    return Question(
        id=f"q{qnum}",
        questionNumber=qnum,
        englishQuestion=raw.get("englishQuestion", "") or "",
        teluguQuestion=raw.get("teluguQuestion", "") or "",
        options=opts,
        correctOption=raw.get("correctOption"),
        hasDiagram=bool(raw.get("hasDiagram", False)),
        subject=subject,
        topic=raw.get("topic") or topic,
        difficulty=raw.get("difficulty") or difficulty,
        explanation=raw.get("explanation", "") or "",
        explanationTelugu=raw.get("explanationTelugu", "") or "",
    )


def generate_one(subject: str, topic: str, difficulty: str, avoid: list[str]) -> dict:
    raw = sap.chat(
        genprompts.REGEN_SYSTEM,
        genprompts.regen_user_prompt(subject, topic, difficulty, avoid),
        max_tokens=1200,
        temperature=0.7,
    )
    return _parse(raw).get("question", {})


def _examples_by_subject(bank: list[dict]) -> dict:
    out: dict[str, list] = {}
    for q in bank:
        out.setdefault(q.get("subject", ""), []).append(q)
    return out


def run_generation(job_id: str, bank: list[dict], target_bank: int = 40) -> None:
    job = JobStatus(jobId=job_id, status="generating", fileName="Daily paper")
    with _lock:
        _gen_jobs[job_id] = job
    try:
        # ── 1. blueprint ──
        bank_by_subject: dict = {}
        for q in bank:
            s = q.get("subject", "")
            bank_by_subject[s] = bank_by_subject.get(s, 0) + 1
        slots = blueprint.build_blueprint(bank_by_subject, target_bank=target_bank)
        for i, s in enumerate(slots):
            s["qnum"] = i + 1
            s["slotId"] = f"slot-{i + 1}"
        _set(job, totalPages=len(slots),
             message="Planning paper (topics & difficulty)…")

        examples = _examples_by_subject(bank)
        questions: dict[int, Question] = {}

        # ── 2. fill bank slots ──
        used_bank_ids = set()
        for slot in slots:
            if slot["source"] != "bank":
                continue
            subj = slot["subject"]
            pool = [q for q in bank
                    if q.get("subject") == subj and id(q) not in used_bank_ids]
            # prefer a topic match
            pick = next((q for q in pool if q.get("topic") == slot["topic"]), None) \
                or (pool[0] if pool else None)
            if pick:
                used_bank_ids.add(id(pick))
                questions[slot["qnum"]] = _to_question(
                    pick, slot["qnum"], subj, pick.get("topic") or slot["topic"],
                    pick.get("difficulty") or slot["difficulty"], "bank")
            else:
                slot["source"] = "ai"  # nothing to reuse → generate instead

        # ── 3. generate ai slots, batched per subject ──
        ai_slots = [s for s in slots if s["source"] == "ai"]
        batches = []
        by_subject: dict = {}
        for s in ai_slots:
            by_subject.setdefault(s["subject"], []).append(s)
        for subj, sslots in by_subject.items():
            for i in range(0, len(sslots), BATCH_SPECS):
                batches.append((subj, sslots[i:i + BATCH_SPECS]))

        _set(job, status="generating",
             message=f"Writing {len(ai_slots)} fresh questions with Claude…")
        done_specs = 0

        def do_batch(subj, sslots):
            specs = [{"slotId": s["slotId"], "topic": s["topic"], "difficulty": s["difficulty"]}
                     for s in sslots]
            raw = sap.chat(
                genprompts.GEN_SYSTEM,
                genprompts.gen_user_prompt(subj, specs, examples.get(subj, [])),
                max_tokens=4000,
                temperature=0.7,
            )
            try:
                gen = _parse(raw).get("questions", [])
            except Exception:
                gen = []
            by_slot = {g.get("slotId"): g for g in gen}
            out = []
            for s in sslots:
                g = by_slot.get(s["slotId"], {})
                out.append((s, g))
            return out

        with cf.ThreadPoolExecutor(max_workers=settings.VISION_CONCURRENCY) as ex:
            futures = [ex.submit(do_batch, subj, ss) for subj, ss in batches]
            for fut in cf.as_completed(futures):
                for slot, g in fut.result():
                    if g:
                        questions[slot["qnum"]] = _to_question(
                            g, slot["qnum"], slot["subject"], slot["topic"],
                            slot["difficulty"], "ai")
                    done_specs += 1
                _set(job, pagesDone=min(done_specs, len(ai_slots)),
                     questionsFound=len(questions))

        # ── 3b. backfill any slots the batched pass missed ──
        # A batch can drop a slot if the model omits its slotId or returns
        # invalid JSON. Fill those individually so the paper is always complete.
        missing = [s for s in slots if s["qnum"] not in questions]
        if missing:
            _set(job, message=f"Completing {len(missing)} remaining question(s)…")

            def fill_one(slot):
                try:
                    g = generate_one(slot["subject"], slot["topic"], slot["difficulty"], [])
                    return slot, (g or None)
                except Exception:
                    return slot, None

            with cf.ThreadPoolExecutor(max_workers=settings.VISION_CONCURRENCY) as ex:
                for fut in cf.as_completed([ex.submit(fill_one, s) for s in missing]):
                    slot, g = fut.result()
                    if g:
                        questions[slot["qnum"]] = _to_question(
                            g, slot["qnum"], slot["subject"], slot["topic"],
                            slot["difficulty"], "ai")
                    _set(job, questionsFound=len(questions))

        # ── 4. de-duplicate generated questions ──
        _set(job, status="enriching", message="Checking for duplicates…")
        ordered = [questions[n] for n in sorted(questions)]
        seen_stems: list[str] = []
        dup_count = 0
        for q in ordered:
            if q.correctOption is None:
                continue
            text = _stem(q)
            if _max_sim(text, seen_stems) > DUP_THRESHOLD and q.id.startswith("q"):
                # regenerate up to twice, avoiding the closest matches
                for _ in range(2):
                    try:
                        avoid = sorted(seen_stems, key=lambda o: _similarity(text, o), reverse=True)[:6]
                        newq = generate_one(q.subject, q.topic, q.difficulty, avoid)
                        if newq and _max_sim(_stem(newq), seen_stems) <= DUP_THRESHOLD:
                            q.englishQuestion = newq.get("englishQuestion", q.englishQuestion)
                            q.teluguQuestion = newq.get("teluguQuestion", q.teluguQuestion)
                            q.options = [
                                Option(index=o.get("index", k + 1),
                                       english=o.get("english", "") or "",
                                       telugu=o.get("telugu", "") or "")
                                for k, o in enumerate((newq.get("options") or [])[:4])
                            ]
                            q.correctOption = newq.get("correctOption", q.correctOption)
                            q.explanation = newq.get("explanation", q.explanation)
                            q.explanationTelugu = newq.get("explanationTelugu", q.explanationTelugu)
                            text = _stem(q)
                            break
                    except Exception:
                        break
                else:
                    dup_count += 1
            seen_stems.append(text)

        # ── 5. stats ──
        by_subject_c: dict = {}
        by_difficulty = {"easy": 0, "medium": 0, "hard": 0}
        by_source = {"ai": 0, "bank": 0}
        for n in sorted(questions):
            q = questions[n]
            by_subject_c[q.subject] = by_subject_c.get(q.subject, 0) + 1
            if q.difficulty in by_difficulty:
                by_difficulty[q.difficulty] += 1
        # source counts from the (possibly adjusted) blueprint
        for s in slots:
            by_source[s["source"]] = by_source.get(s["source"], 0) + 1

        _set(job, status="done", questions=[questions[n] for n in sorted(questions)],
             stats={"total": len(questions), "bySubject": by_subject_c,
                    "byDifficulty": by_difficulty, "bySource": by_source,
                    "duplicatesFlagged": dup_count},
             message=f"Generated {len(questions)} questions.")
    except Exception as e:  # noqa: BLE001
        _set(job, status="error", error=str(e), message="Generation failed.")
