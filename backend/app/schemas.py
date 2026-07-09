"""Pydantic models for API responses and the internal question shape."""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class Option(BaseModel):
    index: int
    english: str = ""
    telugu: str = ""


class Question(BaseModel):
    id: str
    questionNumber: int
    englishQuestion: str = ""
    teluguQuestion: str = ""
    options: list[Option] = []
    correctOption: Optional[int] = None
    hasDiagram: bool = False
    # Filled by the enrichment pass:
    subject: str = ""
    topic: str = ""
    difficulty: str = ""
    explanation: str = ""
    explanationTelugu: str = ""


class JobStatus(BaseModel):
    jobId: str
    status: str  # queued | rendering | extracting | enriching | done | error
    totalPages: int = 0
    pagesDone: int = 0
    questionsFound: int = 0
    # Enrichment (tagging + writing explanations) progress:
    enrichTotal: int = 0
    enrichDone: int = 0
    message: str = ""
    error: str = ""
    # Present only when status == done:
    fileName: str = ""
    questions: list[Question] = []
    stats: dict = {}
    # How many questions the paper's text layer says exist (e.g. 150), and which
    # of those numbers could NOT be extracted — so the admin can add them by hand.
    expectedTotal: int = 0
    missingQuestions: list[int] = []
