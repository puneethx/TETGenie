"""Builds a 150-question paper blueprint that mirrors the real AP TET SGT
Paper I: 5 subjects × 30 questions, each subject's questions distributed across
its topics by weightage and across difficulties by the target ratio.

The blueprint is a flat list of slot specs: {subject, topic, difficulty, source}
where source is 'ai' (Claude generates it) or 'bank' (reuse a previous-year Q).
"""
from __future__ import annotations

from .prompts import SUBJECTS

PER_SUBJECT = 30

# Global difficulty target ≈ Easy 45 / Medium 75 / Hard 30 out of 150
# (per subject: 9 / 15 / 6). Matches the README: "Easy 40-50, Medium 70-80, Hard 20-30".
DIFFICULTY_RATIO = {"easy": 9, "medium": 15, "hard": 6}

# Relative topic weights per subject (approx. marks, from the syllabus README).
# Topic strings MUST match app.prompts.TOPICS so tags stay consistent.
TOPIC_WEIGHTS = {
    "Child Development and Pedagogy": {
        "Development of Child": 11, "Understanding Learning": 7,
        "Pedagogical Concerns": 7, "ICT in Teaching & Learning": 2.5,
        "Education Policies, Acts & Schemes": 2.5,
    },
    "Language I (Telugu)": {
        "Padajalam (Vocabulary)": 5.5, "Vyakaranam (Grammar)": 5, "Sandhulu": 3,
        "Samasalu": 3, "Chandassu": 1.5, "Alankaralu": 2, "Vakyalu": 4,
        "Reading Comprehension": 3, "Textbook/Poet": 2, "Methodology": 6,
    },
    "Language II (English)": {
        "Vocabulary": 5.5, "Grammar": 8.5, "Reading Comprehension": 3.5,
        "Conventions of Writing": 2.5, "Discourses": 2.5, "Dictionary Skills": 1,
        "Methodology": 6,
    },
    "Mathematics": {
        "Numbers": 6.5, "Arithmetic": 3.5, "Geometry": 4.5, "Data Handling": 1.5,
        "Algebra": 3.5, "Mensuration": 4.5, "Methodology": 6,
    },
    "Environmental Studies": {
        "Plants, Animals & Environment": 4.5, "India & Andhra Pradesh": 4.5,
        "Food/Water/Shelter/Travel": 3.5, "Health & Hygiene": 2.5,
        "Disaster Management": 1.5, "Energy": 1.5, "Family & Friends": 2,
        "Methodology": 6,
    },
}


def allocate(total: int, weights: dict) -> dict:
    """Distribute `total` items across keys proportional to weights, summing
    exactly to `total` (largest-remainder method)."""
    wsum = sum(weights.values()) or 1
    raw = {k: (w / wsum) * total for k, w in weights.items()}
    floors = {k: int(v) for k, v in raw.items()}
    remaining = total - sum(floors.values())
    # hand out the remaining to the largest fractional remainders
    order = sorted(weights, key=lambda k: raw[k] - floors[k], reverse=True)
    for i in range(remaining):
        floors[order[i % len(order)]] += 1
    return floors


def _expand(counts: dict) -> list:
    out = []
    for key, n in counts.items():
        out.extend([key] * n)
    return out


def build_blueprint(bank_by_subject: dict | None = None,
                    target_bank: int = 40, rng=None) -> list[dict]:
    """Return 150 slot specs. `bank_by_subject` maps subject -> number of
    previous-year questions available, so bank slots are only assigned where we
    actually have questions to reuse.

    `rng` is an optional seeded random.Random. When given, the topic and
    difficulty of each slot are shuffled INDEPENDENTLY within every subject, and
    which slots are 'bank' vs 'ai' is randomised too. The subject/topic/difficulty
    RATIOS stay exactly the same (same counts) — only the pairing changes — so a
    different seed each day yields a genuinely different paper that still mirrors
    the real exam's weightage."""
    bank_by_subject = bank_by_subject or {}
    per_subject_bank_target = target_bank // len(SUBJECTS)
    slots: list[dict] = []
    for subject in SUBJECTS:
        topics = _expand(allocate(PER_SUBJECT, TOPIC_WEIGHTS[subject]))
        diffs = _expand(allocate(PER_SUBJECT, DIFFICULTY_RATIO))
        n_bank = min(per_subject_bank_target, int(bank_by_subject.get(subject, 0)))
        sources = ["bank"] * n_bank + ["ai"] * (PER_SUBJECT - n_bank)
        if rng is not None:
            rng.shuffle(topics)
            rng.shuffle(diffs)
            rng.shuffle(sources)
        for i in range(PER_SUBJECT):
            slots.append({
                "subject": subject,
                "topic": topics[i],
                "difficulty": diffs[i],
                "source": sources[i],
            })
    return slots


def blueprint_summary(slots: list[dict]) -> dict:
    by_subject: dict = {}
    by_difficulty = {"easy": 0, "medium": 0, "hard": 0}
    by_source = {"ai": 0, "bank": 0}
    for s in slots:
        by_subject[s["subject"]] = by_subject.get(s["subject"], 0) + 1
        by_difficulty[s["difficulty"]] += 1
        by_source[s["source"]] += 1
    return {"total": len(slots), "bySubject": by_subject,
            "byDifficulty": by_difficulty, "bySource": by_source}
