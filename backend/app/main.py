"""TETGenie AI backend — FastAPI app.

Endpoints:
  GET  /                 → service info
  GET  /health           → liveness probe
  POST /extract          → upload a PDF, start extraction, returns {jobId}
  GET  /extract/{jobId}  → poll extraction progress / results
"""
from __future__ import annotations

import uuid
import threading

from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import __version__
from .config import settings
from .auth import require_admin
from .extract import run_extraction, get_job
from .generate import run_generation, get_gen_job, generate_one
from .schemas import JobStatus


class GenerateRequest(BaseModel):
    bank: list[dict] = []       # previous-year questions supplied by the frontend
    targetBank: int = 40        # how many of the 150 to reuse from the bank


class RegenRequest(BaseModel):
    subject: str
    topic: str = ""
    difficulty: str = "medium"
    avoid: list[str] = []


class ResetRequest(BaseModel):
    email: str
    code: str
    newPassword: str

app = FastAPI(title="TETGenie AI Backend", version=__version__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "TETGenie AI Backend",
        "version": __version__,
        "model": settings.AICORE_MODEL_NAME,
        "authEnforced": not settings.DISABLE_AUTH,
    }


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/extract")
async def start_extract(
    file: UploadFile = File(...),
    _admin: dict = Depends(require_admin),
):
    if (file.content_type or "") not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(400, "Please upload a PDF file.")
    data = await file.read()
    size_mb = len(data) / (1024 * 1024)
    if size_mb > settings.MAX_PDF_MB:
        raise HTTPException(413, f"PDF is {size_mb:.1f} MB; limit is {settings.MAX_PDF_MB} MB.")
    if not data[:5] == b"%PDF-":
        raise HTTPException(400, "That file does not look like a PDF.")

    job_id = uuid.uuid4().hex[:12]
    # Seed a queued job so an immediate poll doesn't 404.
    from .extract import _jobs, _jobs_lock
    with _jobs_lock:
        _jobs[job_id] = JobStatus(jobId=job_id, status="queued", fileName=file.filename or "paper.pdf")

    threading.Thread(
        target=run_extraction,
        args=(job_id, data, file.filename or "paper.pdf"),
        daemon=True,
    ).start()
    return {"jobId": job_id}


@app.get("/extract/{job_id}", response_model=JobStatus)
def extract_status(job_id: str, _admin: dict = Depends(require_admin)):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Unknown job id.")
    return job


@app.post("/generate")
def start_generate(req: GenerateRequest, _admin: dict = Depends(require_admin)):
    job_id = uuid.uuid4().hex[:12]
    from .generate import _gen_jobs, _lock as gen_lock
    with gen_lock:
        _gen_jobs[job_id] = JobStatus(jobId=job_id, status="queued", fileName="Daily paper")
    threading.Thread(
        target=run_generation, args=(job_id, req.bank, req.targetBank), daemon=True
    ).start()
    return {"jobId": job_id}


@app.get("/generate/{job_id}", response_model=JobStatus)
def generate_status(job_id: str, _admin: dict = Depends(require_admin)):
    job = get_gen_job(job_id)
    if not job:
        raise HTTPException(404, "Unknown job id.")
    return job


@app.post("/generate/question")
def regenerate_question(req: RegenRequest, _admin: dict = Depends(require_admin)):
    """Regenerate a single question (admin verify → 'regenerate' with difficulty)."""
    q = generate_one(req.subject, req.topic, req.difficulty, req.avoid)
    if not q:
        raise HTTPException(502, "Could not generate a question. Please try again.")
    return {"question": q}


@app.post("/reset-password")
def reset_password_endpoint(req: ResetRequest):
    """Public: reset a user's password using the shared reset code + new password.

    Not admin-gated (the user is signed out) — protected by the reset code, which
    the admin shares per request on WhatsApp.
    """
    from .reset import reset_password
    try:
        reset_password(req.email, req.code, req.newPassword)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception:
        # e.g. no user with that email — keep it generic (no account enumeration).
        raise HTTPException(400, "Could not reset the password. Check the email and code.")
    return {"ok": True}
