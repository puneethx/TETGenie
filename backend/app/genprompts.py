"""Prompts for generating fresh daily-paper questions and regenerating one."""
import json

GEN_SYSTEM = (
    "You are an expert AP TET (SGT Paper I) question setter and a fluent Telugu-English "
    "bilingual educator. You write ORIGINAL, exam-accurate multiple-choice questions at the "
    "level of Andhra Pradesh Teacher Eligibility Test Paper I (for teachers of classes I-V). "
    "Questions must be factually correct, unambiguous, exactly ONE correct option, and mirror "
    "the style/difficulty of the provided previous-year examples. Content questions appear in "
    "BOTH English and Telugu; Language II (English) grammar/vocabulary items are English-only "
    "(leave Telugu fields empty). Output STRICT JSON only — no markdown fences."
)


def _examples_block(examples: list) -> str:
    if not examples:
        return "(no examples provided)"
    lines = []
    for e in examples[:4]:
        lines.append(f"- EN: {e.get('englishQuestion','')} | TE: {e.get('teluguQuestion','')}")
    return "\n".join(lines)


def _avoid_block(avoid: list) -> str:
    if not avoid:
        return "(none)"
    return "\n".join(f"- {a}" for a in avoid[:40])


def gen_user_prompt(subject: str, specs: list, examples: list,
                    avoid: list | None = None, seed: str = "") -> str:
    """specs: list of {slotId, topic, difficulty}. Generate one question each.

    `avoid` is questions used in PREVIOUS papers (and elsewhere in this paper) —
    the model must not repeat them. `seed` is a per-day tag included so that an
    identical request is never sent twice (prevents any response caching from
    handing back yesterday's questions)."""
    specs_json = json.dumps(specs, ensure_ascii=False)
    avoid = avoid or []
    return (
        f"Paper session: {seed or 'adhoc'} (generate content unique to this session).\n"
        f"Subject: {subject}\n"
        f"Previous-year example questions from this subject (match this style & level):\n"
        f"{_examples_block(examples)}\n\n"
        f"Do NOT reuse or lightly reword any of these already-used questions "
        f"(from earlier papers and this paper):\n{_avoid_block(avoid)}\n\n"
        f"Create ONE original question for EACH spec below. Every question must be NEW and "
        f"clearly different from the examples and from the already-used list above — change the "
        f"scenario, numbers, names and framing. Specs (with required topic & difficulty):\n{specs_json}\n\n"
        "For each, return an object: "
        '{"slotId": str (echo it back), "topic": str, "difficulty": str, '
        '"englishQuestion": str, "teluguQuestion": str (\"\" for English-only items), '
        '"options": [{"index":1-4,"english":str,"telugu":str}], '
        '"correctOption": int 1-4, '
        '"explanation": str (1-2 lines, English), '
        '"explanationTelugu": str (1-2 lines, Telugu)}. '
        'Respond with JSON: {"questions":[ ... ]}. Ensure exactly 4 options each and a valid '
        "correctOption. Keep Telugu natural and accurate."
    )


REGEN_SYSTEM = GEN_SYSTEM


def regen_user_prompt(subject: str, topic: str, difficulty: str, avoid: list) -> str:
    avoid_block = "\n".join(f"- {a}" for a in avoid[:8]) or "(none)"
    return (
        f"Create ONE original AP TET SGT Paper I question.\n"
        f"Subject: {subject}\nTopic: {topic}\nDifficulty: {difficulty}\n\n"
        f"It MUST be clearly different from these existing questions:\n{avoid_block}\n\n"
        "Return JSON: {\"question\": {"
        '"englishQuestion": str, "teluguQuestion": str (\"\" if English-only), '
        '"options": [{"index":1-4,"english":str,"telugu":str}], '
        '"correctOption": int 1-4, "explanation": str, "explanationTelugu": str}}.'
    )
