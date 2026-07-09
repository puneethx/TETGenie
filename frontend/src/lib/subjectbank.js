// Aggregates questions of one subject from ALL previous-year papers, for
// subject-wise practice. Cached in memory for the session (the papers list
// rarely changes) so repeat visits are instant.
import { listPapers, getPaperQuestions } from './papers'
import { subjectIdForName } from './subjects'

let _cache = null       // { bySubject: {id: [q]} }
let _inflight = null    // de-dupe concurrent builds (e.g. paper + questions at once)

async function buildCache() {
  const papers = await listPapers()
  const bySubject = {}
  for (const p of papers) {
    let qs = []
    try { qs = await getPaperQuestions(p.id) } catch { qs = [] }
    for (const q of qs) {
      const sid = subjectIdForName(q.subject || '')
      if (!sid) continue
      // Re-key ids so questions from different papers never collide in the exam.
      const uid = `${p.id}:${q.id || q.questionNumber}`
      ;(bySubject[sid] = bySubject[sid] || []).push({ ...q, id: uid, sourcePaper: p.title || p.year || '' })
    }
  }
  _cache = { bySubject }
  return _cache
}

export async function loadSubjectBank({ force = false } = {}) {
  if (_cache && !force) return _cache
  if (!_inflight) {
    _inflight = buildCache().finally(() => { _inflight = null })
  }
  return _inflight
}

export async function getSubjectCounts() {
  const { bySubject } = await loadSubjectBank()
  const counts = {}
  for (const k of Object.keys(bySubject)) counts[k] = bySubject[k].length
  return counts
}

export async function getSubjectQuestions(subjectId) {
  const { bySubject } = await loadSubjectBank()
  return bySubject[subjectId] || []
}
