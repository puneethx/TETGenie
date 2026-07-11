"""Per-topic sub-concept pools used to steer question generation.

The model tends to return the SAME canonical question for a given
(subject, topic, difficulty) every time — e.g. always "Approach-Avoidance
conflict" for CDP / Development of Child. To force genuinely different papers on
every generation, each slot is assigned a RANDOM `focus` sub-concept from these
pools, and the prompt asks the model to build that specific question around the
focus. Different focus each run → different questions, even if the model decodes
deterministically and ignores temperature.

Keys are (subject, topic) exactly as used in app.prompts.TOPICS /
app.blueprint.TOPIC_WEIGHTS. Values are AP TET SGT Paper I sub-areas.
"""
from __future__ import annotations

import random as _random

SUBTOPICS: dict[str, dict[str, list[str]]] = {
    "Child Development and Pedagogy": {
        "Development of Child": [
            "Piaget's stages of cognitive development", "Vygotsky's socio-cultural theory and ZPD",
            "Kohlberg's stages of moral development", "Erikson's psychosocial stages",
            "principles of development (continuity, individual differences)",
            "heredity versus environment", "types of conflict (approach/avoidance)",
            "emotional intelligence (Goleman)", "physical and motor development milestones",
            "adolescence and its characteristics", "socialization and agencies of socialization",
            "self-concept and self-esteem", "language development in children",
            "factors influencing growth and development",
        ],
        "Understanding Learning": [
            "Pavlov's classical conditioning", "Skinner's operant conditioning",
            "Thorndike's laws of learning", "Kohler's insight learning (Gestalt)",
            "Bandura's observational learning", "transfer of learning",
            "learning curves and plateau", "Maslow's hierarchy of needs and motivation",
            "memory, retention and forgetting", "Bruner's discovery learning",
            "Gagne's types of learning", "concept formation", "factors affecting learning",
        ],
        "Pedagogical Concerns": [
            "constructivist approach", "cooperative and collaborative learning",
            "child-centred teaching", "teaching learning material (TLM)",
            "continuous and comprehensive evaluation (CCE)", "inclusive education",
            "multi-grade and multi-level teaching", "questioning skills",
            "activity-based learning", "remedial teaching", "learning styles",
            "micro-teaching skills",
        ],
        "ICT in Teaching & Learning": [
            "computer terminology (VIRUS, CPU, RAM)", "educational software and tools",
            "internet and e-learning", "smart classroom and projectors",
            "open educational resources", "uses of ICT in assessment",
            "hardware versus software",
        ],
        "Education Policies, Acts & Schemes": [
            "Right to Education Act 2009", "National Education Policy 2020",
            "NCF 2005 and State Curriculum Framework", "mid-day meal scheme",
            "Sarva Shiksha Abhiyan", "child rights and POCSO Act",
            "Kothari Commission", "National Policy on Education 1986",
        ],
    },
    "Language I (Telugu)": {
        "Padajalam (Vocabulary)": [
            "పర్యాయపదాలు (synonyms)", "నానార్థాలు (multiple meanings)",
            "వ్యతిరేకార్థకాలు (antonyms)", "ప్రకృతి - వికృతి", "జాతీయాలు (idioms)",
            "సామెతలు (proverbs)", "నుడికారాలు", "పొడుపు కథలు",
        ],
        "Vyakaranam (Grammar)": [
            "లింగ - వచనాలు", "విభక్తులు", "క్రియలు", "పదజాతులు",
            "తత్సమ - తద్భవ పదాలు", "దేశ్య - గ్రామ్య పదాలు", "కారకాలు", "మహద్ - అమహద్",
        ],
        "Sandhulu": [
            "సవర్ణదీర్ఘ సంధి", "గుణ సంధి", "యడాగమ సంధి", "అత్వ సంధి", "ఇత్వ సంధి",
            "ఉత్వ సంధి", "సరళాదేశ సంధి", "గసడదవాదేశ సంధి", "త్రిక సంధి",
        ],
        "Samasalu": [
            "తత్పురుష సమాసం", "ద్వంద్వ సమాసం", "ద్విగు సమాసం", "బహువ్రీహి సమాసం",
            "కర్మధారయ సమాసం", "అవ్యయీభావ సమాసం", "రూపక సమాసం",
        ],
        "Chandassu": [
            "ఉత్పలమాల", "చంపకమాల", "శార్దూలం", "మత్తేభం", "కంద పద్యం",
            "ఆటవెలది", "తేటగీతి", "సీసం", "గణ విభజన", "యతి - ప్రాస",
        ],
        "Alankaralu": [
            "ఉపమాలంకారం", "రూపకాలంకారం", "ఉత్ప్రేక్షాలంకారం", "శ్లేషాలంకారం",
            "అతిశయోక్తి", "వృత్త్యనుప్రాస", "అంత్యానుప్రాస", "యమకం", "ఛేకానుప్రాస", "స్వభావోక్తి",
        ],
        "Vakyalu": [
            "సామాన్య వాక్యం", "సంయుక్త వాక్యం", "సంశ్లిష్ట వాక్యం", "ప్రశ్నార్థక వాక్యం",
            "ఆజ్ఞార్థక వాక్యం", "చేదర్థక వాక్యం", "ప్రత్యక్ష - పరోక్ష వాక్యాలు", "కర్తరి - కర్మణి వాక్యాలు",
        ],
        "Reading Comprehension": [
            "గద్య భాగం ప్రధాన భావం", "పద్య భాగం అర్థం", "కవి / రచయిత వివరాలు",
            "పాఠ్యాంశ ఆధారిత ప్రశ్న", "నీతి / సందేశం",
        ],
        "Textbook/Poet": [
            "కవుల జీవిత విశేషాలు", "రచనలు మరియు గ్రంథాలు", "బిరుదులు", "కలం పేర్లు",
            "పాఠ్యాంశ నేపథ్యం", "ప్రక్రియలు (సంభాషణ, కథ, గేయం)",
        ],
        "Methodology": [
            "భాషా నైపుణ్యాలు (వినడం, మాట్లాడటం, చదవడం, రాయడం)", "బోధనా పద్ధతులు",
            "నిర్మాణాత్మక మూల్యాంకనం", "పాఠ్య ప్రణాళిక", "భాషా బోధన సూత్రాలు",
            "నివేదిక / సమీక్ష", "చర్చా పద్ధతి", "మాతృభాషా బోధన లక్ష్యాలు",
        ],
    },
    "Language II (English)": {
        "Vocabulary": [
            "synonyms in context", "antonyms", "prefixes and suffixes",
            "one-word substitutions", "homophones and homonyms", "idioms and phrases",
            "word formation", "collocations",
        ],
        "Grammar": [
            "articles", "prepositions", "tenses and verb forms",
            "subject-verb agreement", "active and passive voice",
            "direct and indirect speech", "modals", "main and subordinate clauses",
            "determiners", "question tags", "conjunctions", "degrees of comparison",
        ],
        "Reading Comprehension": [
            "main idea of a passage", "inference from a passage",
            "vocabulary from a passage", "true/false based on a passage", "choosing a title",
        ],
        "Conventions of Writing": [
            "punctuation (hyphen, comma, apostrophe)", "capitalization",
            "spelling", "abbreviations",
        ],
        "Discourses": [
            "notice writing format", "letter and message format",
            "dialogue and conversation", "description versus narration",
            "features of a poem", "paragraph writing",
        ],
        "Dictionary Skills": [
            "guide words and alphabetical order", "dictionary abbreviations (n., v., adj.)",
            "pronunciation symbols", "multiple-meaning entries",
        ],
        "Methodology": [
            "structural and communicative approaches", "Grammar Translation Method",
            "teaching LSRW skills", "language across the curriculum",
            "transcription and phonetics", "famous quotes on language",
            "bilingual method", "English as a global language",
        ],
    },
    "Mathematics": {
        "Numbers": [
            "primes and composites", "HCF and LCM", "divisibility rules",
            "place value and face value", "perfect squares and cubes",
            "factors and multiples", "rational and irrational numbers",
            "comparing numbers and inequalities",
        ],
        "Arithmetic": [
            "percentages", "profit and loss", "simple interest", "ratio and proportion",
            "unitary method", "averages", "time and work", "speed, distance and time",
        ],
        "Geometry": [
            "types of angles", "triangles and their properties",
            "circles (radius, chord, diameter)", "polygons and interior angles",
            "parallel lines", "symmetry", "geometric constructions", "properties of 2D shapes",
        ],
        "Data Handling": [
            "mean, median and mode", "pie chart and sector angle",
            "bar graph interpretation", "pictograph", "basic probability", "frequency tables",
        ],
        "Algebra": [
            "linear equations in one variable", "algebraic expressions and terms",
            "factorisation", "exponents and powers", "algebraic identities",
            "patterns and sequences", "simplification",
        ],
        "Mensuration": [
            "area of rectangle, square and triangle", "perimeter",
            "circumference and area of a circle", "volume of cuboid, cube and cylinder",
            "surface area", "unit conversion", "fencing and cost problems",
        ],
        "Methodology": [
            "nature of mathematics", "instructional objectives (Bloom's taxonomy)",
            "mathematics kit (Napier bands, beads frame)", "types of proofs in validation",
            "teaching aids in maths", "evaluation in mathematics",
            "laboratory and inductive methods", "NCF recommendations for maths",
        ],
    },
    "Environmental Studies": {
        "Plants, Animals & Environment": [
            "plant nutrition (autotrophs, insectivorous plants)", "photosynthesis",
            "animal adaptations", "plant cell versus animal cell",
            "symbiosis and parasitism", "classification of organisms",
            "food chains and food webs", "human reproduction and fertilization",
        ],
        "India & Andhra Pradesh": [
            "national parks and wildlife sanctuaries", "rivers and geography of AP",
            "census and population", "freedom fighters and social reformers",
            "industries (steel, cotton, jute)", "Indus Valley civilization and seals",
            "Indian Constitution articles and lists", "fundamental rights and duties",
            "Supreme Court and judiciary", "important dates in history",
        ],
        "Food/Water/Shelter/Travel": [
            "balanced diet and vitamins", "deficiency diseases", "water cycle and conservation",
            "modes of transport", "types of houses", "food preservation",
        ],
        "Health & Hygiene": [
            "communicable diseases and their spread", "vitamins and their sources",
            "first aid", "personal hygiene", "nutrients and their functions", "vaccination",
        ],
        "Disaster Management": [
            "earthquakes", "floods and cyclones", "fire safety", "drought",
            "disaster preparedness and mitigation",
        ],
        "Energy": [
            "renewable and non-renewable sources", "forms of energy",
            "basics of electricity", "solar energy", "conservation of energy",
        ],
        "Family & Friends": [
            "types of families and relationships", "community helpers", "festivals",
            "rights and duties in a community", "cooperation and sharing",
        ],
        "Methodology": [
            "approaches to teaching EVS", "synthetic versus analytic approach",
            "understanding versus knowledge objectives", "concept maps and mind maps",
            "EVS lesson planning", "discussion method", "assessment in EVS",
            "syntactic and substantive structure of a subject",
        ],
    },
}


def pick(rng, subject: str, topic: str) -> str:
    """A random sub-concept for the (subject, topic). Falls back to the topic
    itself if we have no pool. `rng` may be None (uses module-level random)."""
    pool = SUBTOPICS.get(subject, {}).get(topic)
    if not pool:
        return topic
    return (rng or _random).choice(pool)
