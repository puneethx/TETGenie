// Calls to the TETGenie AI backend (Railway). The backend does only the
// AI-heavy jobs (PDF extraction now; paper generation in Phase 3).
import { auth } from './firebase'

const BASE = (import.meta.env.VITE_AI_BACKEND_URL || '').replace(/\/$/, '')

export const isBackendConfigured = Boolean(BASE)

async function authHeader() {
  const u = auth?.currentUser
  if (!u) return {}
  const token = await u.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

async function parseError(res) {
  try {
    const data = await res.json()
    return data.detail || data.message || `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

// Upload a PDF; returns { jobId }.
export async function startExtraction(file) {
  if (!BASE) throw new Error('AI backend URL is not configured (VITE_AI_BACKEND_URL).')
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${BASE}/extract`, {
    method: 'POST',
    headers: await authHeader(),
    body: fd,
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

// Poll a job's status; returns the JobStatus object.
export async function getExtractionJob(jobId) {
  const res = await fetch(`${BASE}/extract/${jobId}`, { headers: await authHeader() })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

// Poll until done/error, calling onProgress(job) after each poll.
export async function waitForExtraction(jobId, onProgress, intervalMs = 2500) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await getExtractionJob(jobId)
    onProgress?.(job)
    if (job.status === 'done' || job.status === 'error') return job
    await new Promise((r) => setTimeout(r, intervalMs))
  }
}

// ── Daily-paper generation ──
export async function startGeneration(bank, targetBank = 40) {
  if (!BASE) throw new Error('AI backend URL is not configured (VITE_AI_BACKEND_URL).')
  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ bank, targetBank }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function getGenerationJob(jobId) {
  const res = await fetch(`${BASE}/generate/${jobId}`, { headers: await authHeader() })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function waitForGeneration(jobId, onProgress, intervalMs = 2500) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await getGenerationJob(jobId)
    onProgress?.(job)
    if (job.status === 'done' || job.status === 'error') return job
    await new Promise((r) => setTimeout(r, intervalMs))
  }
}

// Regenerate a single question at a chosen difficulty (admin verify screen).
export async function regenerateQuestion({ subject, topic, difficulty, avoid = [] }) {
  const res = await fetch(`${BASE}/generate/question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ subject, topic, difficulty, avoid }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return (await res.json()).question
}
