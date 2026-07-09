"""Prompts for extraction (vision) and enrichment (text), plus the TET taxonomy."""

# The 5 subjects of AP TET SGT Paper I, in the standard paper order.
SUBJECTS = [
    "Child Development and Pedagogy",
    "Language I (Telugu)",
    "Language II (English)",
    "Mathematics",
    "Environmental Studies",
]

# Compact per-subject topic list (from the syllabus README) to guide tagging.
TOPICS = {
    "Child Development and Pedagogy": [
        "Development of Child", "Understanding Learning", "Pedagogical Concerns",
        "ICT in Teaching & Learning", "Education Policies, Acts & Schemes",
    ],
    "Language I (Telugu)": [
        "Padajalam (Vocabulary)", "Vyakaranam (Grammar)", "Sandhulu", "Samasalu",
        "Chandassu", "Alankaralu", "Vakyalu", "Reading Comprehension",
        "Textbook/Poet", "Methodology",
    ],
    "Language II (English)": [
        "Vocabulary", "Grammar", "Reading Comprehension", "Conventions of Writing",
        "Discourses", "Dictionary Skills", "Methodology",
    ],
    "Mathematics": [
        "Numbers", "Arithmetic", "Geometry", "Data Handling", "Algebra",
        "Mensuration", "Methodology",
    ],
    "Environmental Studies": [
        "Plants, Animals & Environment", "India & Andhra Pradesh", "Food/Water/Shelter/Travel",
        "Health & Hygiene", "Disaster Management", "Energy", "Family & Friends", "Methodology",
    ],
}

# Standard AP TET SGT Paper I ordering: 30 questions per subject.
def subject_for_qnum(qnum: int) -> str:
    idx = min(max((qnum - 1) // 30, 0), 4)
    return SUBJECTS[idx]


EXTRACT_SYSTEM = (
    "You extract multiple-choice questions from ONE page image of an AP TET (SGT Paper I) "
    "bilingual exam paper. Each question usually appears in BOTH English and Telugu, with 4 "
    "options each (also in English and Telugu). Language II (English) grammar/vocabulary "
    "questions are English-only — for those, leave the Telugu fields as empty strings; DO NOT "
    "invent a translation. The CORRECT option is highlighted in GREEN and/or has a small green "
    "check/tick icon. Output STRICT JSON only — no markdown code fences, no commentary."
)


def extract_user_prompt(expected_qnums: list[int]) -> str:
    hint = ", ".join(str(n) for n in expected_qnums) if expected_qnums else "unknown"
    return (
        "Extract EVERY question visible on this page. "
        f"Expected question number(s) on this page: {hint}. "
        "For each question return an object with keys: "
        '"questionNumber" (int), "englishQuestion" (str), "teluguQuestion" (str, may be ""), '
        '"options" (array of exactly 4 objects: {"index":1-4,"english":str,"telugu":str}), '
        '"correctOption" (int 1-4, the GREEN/ticked option; null if none is highlighted), '
        '"hasDiagram" (bool — true if a figure/diagram/table is needed to answer). '
        'Respond with JSON: {"questions":[ ... ]} sorted by questionNumber. '
        "Preserve Telugu script exactly. Skip any question that is only partially visible "
        "(it continues on another page)."
    )


def extract_user_prompt_multipage(expected_qnums: list[int], num_pages: int) -> list[str]:
    """Return per-page text labels for a multi-page question group.

    The first label carries the full extraction instruction; subsequent labels
    mark the pages as continuations so the model assembles the full question.
    """
    hint = ", ".join(str(n) for n in expected_qnums) if expected_qnums else "unknown"
    labels = []
    for i in range(num_pages):
        if i == 0:
            labels.append(
                f"Page 1 of {num_pages}. "
                "The following pages together form a COMPLETE question set — a question whose "
                "header appears on page 1 may have its body on page 2 and options on page 3. "
                "Read ALL provided pages before writing your answer. "
                f"Expected question number(s): {hint}. "
                "For each question return an object with keys: "
                '"questionNumber" (int), "englishQuestion" (str), "teluguQuestion" (str, may be ""), '
                '"options" (array of exactly 4 objects: {"index":1-4,"english":str,"telugu":str}), '
                '"correctOption" (int 1-4, the GREEN/ticked option; null if none is highlighted), '
                '"hasDiagram" (bool — true if a figure/diagram/table is needed to answer). '
                'After viewing ALL pages, respond with JSON: {"questions":[ ... ]} sorted by questionNumber. '
                "Preserve Telugu script exactly."
            )
        else:
            labels.append(f"Page {i + 1} of {num_pages} (continuation of question {hint}).")
    return labels


ENRICH_SYSTEM = (
    "You are an AP TET (SGT Paper I) subject expert and bilingual (Telugu/English) educator. "
    "For each exam question you are given, classify it and write a short explanation. "
    "Output STRICT JSON only — no markdown fences."
)


def enrich_user_prompt(questions_json: str) -> str:
    subj = "; ".join(SUBJECTS)
    topics = "\n".join(f"- {s}: {', '.join(t)}" for s, t in TOPICS.items())
    return (
        "Classify each question below and add an explanation. Subjects (pick exactly one):\n"
        f"{subj}\n\nAllowed topics per subject:\n{topics}\n\n"
        "For EACH question, using its 'id', return: "
        '{"id": str, "subject": str (one of the subjects above), '
        '"topic": str (one of that subject\'s topics), '
        '"difficulty": "easy"|"medium"|"hard" '
        "(AP TET is mostly easy-moderate; reserve 'hard' for genuinely tricky items), "
        '"explanation": str (1-2 lines, English, why the correct answer is right), '
        '"explanationTelugu": str (1-2 lines, the same explanation in Telugu)}. '
        "A 'subjectHint' is provided per question from its position in the paper — trust it "
        "unless the content clearly says otherwise. "
        'Respond with JSON: {"items":[ ... ]}.\n\nQuestions:\n' + questions_json
    )
