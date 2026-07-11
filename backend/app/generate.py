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

import os
import re
import json
import random
import threading
import concurrent.futures as cf

from .config import settings
from .sap import sap
from . import blueprint, genprompts, subtopics
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


def generate_one(subject: str, topic: str, difficulty: str, avoid: list[str],
                 nonce: str = "", focus: str = "") -> dict:
    # If no focus was supplied, pick a random sub-concept so single regenerations
    # also vary instead of returning the topic's canonical question.
    focus = focus or subtopics.pick(None, subject, topic)
    raw = sap.chat(
        genprompts.REGEN_SYSTEM,
        genprompts.regen_user_prompt(subject, topic, difficulty, avoid,
                                     nonce=nonce, focus=focus),
        max_tokens=1200,
        temperature=0.9,
    )
    return _parse(raw).get("question", {})


def _examples_by_subject(bank: list[dict]) -> dict:
    out: dict[str, list] = {}
    for q in bank:
        out.setdefault(q.get("subject", ""), []).append(q)
    return out


def run_generation(job_id: str, bank: list[dict], target_bank: int = 40,
                   seed: str = "", avoid: list[str] | None = None) -> None:
    job = JobStatus(jobId=job_id, status="generating", fileName="Daily paper")
    with _lock:
        _gen_jobs[job_id] = job
    try:
        # Mix fresh server-side entropy into the seed so EVERY generation is unique
        # — different reused questions, slot arrangement, sub-concept focuses and
        # prompt nonce — even if two requests carry the same date (or the frontend
        # sends a plain date). This is the guarantee that no two papers are alike.
        run_seed = f"{seed or 'gen'}-{os.urandom(6).hex()}"
        rng = random.Random(run_seed)
        # Questions used in recent papers — never repeat these (plus we grow this
        # list with each question we place, so the paper has no internal repeats).
        avoid_stems: list[str] = list(avoid or [])
        # EVERY previous-year question, grouped by subject. These are fed to the
        # model as "already asked — invent something new on the same topic", which
        # is what actually breaks the model's habit of returning the one canonical
        # question per topic every time.
        py_by_subject: dict[str, list[str]] = {}
        for q in bank:
            st = _stem(q)
            if st:
                py_by_subject.setdefault(q.get("subject", ""), []).append(st)

        # ── 1. blueprint ──
        bank_by_subject: dict = {}
        for q in bank:
            s = q.get("subject", "")
            bank_by_subject[s] = bank_by_subject.get(s, 0) + 1
        slots = blueprint.build_blueprint(bank_by_subject, target_bank=target_bank, rng=rng)
        for i, s in enumerate(slots):
            s["qnum"] = i + 1
            s["slotId"] = f"slot-{i + 1}"
            # A random sub-concept per slot — this is what forces genuinely
            # different questions each run instead of the one canonical question
            # the model defaults to for a topic.
            s["focus"] = subtopics.pick(rng, s["subject"], s["topic"])
        _set(job, totalPages=len(slots),
             message="Planning paper (topics & difficulty)…")

        examples = _examples_by_subject(bank)
        # Shuffle the examples fed to the model so it isn't anchored on the same
        # few questions every day (and pick a varied handful each run).
        for subj in examples:
            rng.shuffle(examples[subj])
        questions: dict[int, Question] = {}

        # ── 2. fill bank slots (rotated by seed → different reuse each day) ──
        used_bank_ids = set()

        def _fresh(q) -> bool:
            return _stem(q) not in avoid_stems  # not used in a recent paper

        for slot in slots:
            if slot["source"] != "bank":
                continue
            subj = slot["subject"]
            pool = [q for q in bank
                    if q.get("subject") == subj and id(q) not in used_bank_ids]
            rng.shuffle(pool)  # rotate which previous-year question we reuse
            pick = (
                next((q for q in pool if q.get("topic") == slot["topic"] and _fresh(q)), None)
                or next((q for q in pool if _fresh(q)), None)
                or next((q for q in pool if q.get("topic") == slot["topic"]), None)
                or (pool[0] if pool else None)
            )
            if pick:
                used_bank_ids.add(id(pick))
                q = _to_question(
                    pick, slot["qnum"], subj, pick.get("topic") or slot["topic"],
                    pick.get("difficulty") or slot["difficulty"], "bank")
                questions[slot["qnum"]] = q
                avoid_stems.append(_stem(q))
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

        # A per-subject "do NOT reproduce these" list for the prompt: a RANDOM,
        # rotated sample of that subject's previous-year questions plus recent
        # daily questions. Rotating it every run makes the prompt itself different
        # each generation, so the model's output changes even for the same date
        # and even if the endpoint ignores temperature.
        avoid_prompt: dict[str, list[str]] = {}
        for subj in set(list(py_by_subject) + [s["subject"] for s in slots]):
            sample = list(py_by_subject.get(subj, []))
            rng.shuffle(sample)
            recent = list(avoid or [])
            rng.shuffle(recent)
            avoid_prompt[subj] = (recent[:12] + sample)[:45]

        _set(job, status="generating",
             message=f"Writing {len(ai_slots)} fresh questions with Claude…")
        done_specs = 0

        def do_batch(subj, sslots):
            specs = [{"slotId": s["slotId"], "topic": s["topic"],
                      "difficulty": s["difficulty"], "focus": s.get("focus", s["topic"])}
                     for s in sslots]
            raw = sap.chat(
                genprompts.GEN_SYSTEM,
                genprompts.gen_user_prompt(subj, specs, examples.get(subj, [])[:6],
                                           avoid=avoid_prompt.get(subj, []), seed=run_seed),
                max_tokens=4000,
                temperature=0.9,
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
        # invalid JSON. We retry the missing slots in several rounds so the paper
        # reliably reaches the full 150 — the model re-generates exactly the
        # topics/difficulties that are still empty.
        def fill_one(slot):
            try:
                g = generate_one(slot["subject"], slot["topic"], slot["difficulty"],
                                 avoid_prompt.get(slot["subject"], []),
                                 nonce=f"{run_seed}-{slot['qnum']}",
                                 focus=slot.get("focus", ""))
                return slot, (g or None)
            except Exception:
                return slot, None

        for round_no in range(4):  # up to 4 passes chasing the last few
            missing = [s for s in slots if s["qnum"] not in questions]
            if not missing:
                break
            _set(job, message=f"Completing {len(missing)} remaining question(s)… "
                              f"(pass {round_no + 1})")
            with cf.ThreadPoolExecutor(max_workers=settings.VISION_CONCURRENCY) as ex:
                for fut in cf.as_completed([ex.submit(fill_one, s) for s in missing]):
                    slot, g = fut.result()
                    if g:
                        questions[slot["qnum"]] = _to_question(
                            g, slot["qnum"], slot["subject"], slot["topic"],
                            slot["difficulty"], "ai")
                    _set(job, questionsFound=len(questions))

        # ── 4. de-duplicate generated questions ──
        # Seed the "seen" list with questions from recent papers so today's fresh
        # questions can't collide with earlier days either. Bank (reused
        # previous-year) questions are intentionally kept as-is.
        _set(job, status="enriching", message="Checking for duplicates…")
        ordered = [questions[n] for n in sorted(questions)]
        bank_qnums = {s["qnum"] for s in slots if s["source"] == "bank"}
        # Seed with recent-daily questions AND every previous-year question, so a
        # generated question that merely echoes a previous-year one is caught and
        # regenerated — the AI questions must be genuinely new.
        seen_stems: list[str] = list(avoid or [])
        for stems in py_by_subject.values():
            seen_stems.extend(stems)
        dup_count = 0
        for q in ordered:
            if q.correctOption is None:
                continue
            text = _stem(q)
            if (q.questionNumber not in bank_qnums
                    and _max_sim(text, seen_stems) > DUP_THRESHOLD and q.id.startswith("q")):
                # regenerate up to twice, avoiding the closest matches
                for _try in range(2):
                    try:
                        avoid = sorted(seen_stems, key=lambda o: _similarity(text, o), reverse=True)[:6]
                        newq = generate_one(q.subject, q.topic, q.difficulty, avoid,
                                            nonce=f"{run_seed}-dup{q.questionNumber}-{_try}",
                                            focus=subtopics.pick(rng, q.subject, q.topic))
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

        expected = len(slots)
        missing_numbers = [s["qnum"] for s in slots if s["qnum"] not in questions]
        _set(job, status="done", questions=[questions[n] for n in sorted(questions)],
             stats={"total": len(questions), "expected": expected,
                    "missingNumbers": missing_numbers,
                    "bySubject": by_subject_c,
                    "byDifficulty": by_difficulty, "bySource": by_source,
                    "duplicatesFlagged": dup_count},
             message=f"Generated {len(questions)} of {expected} questions.")
    except Exception as e:  # noqa: BLE001
        _set(job, status="error", error=str(e), message="Generation failed.")
