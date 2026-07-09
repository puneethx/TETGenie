// Resolves a paper by "kind" so shared components (PaperView, Exam) work for
// previous-year papers, daily papers, and subject-wise practice sets.
import { getPaper, getPaperQuestions } from './papers'
import { getDailyPaper, getDailyQuestions } from './daily'
import { getSubjectQuestions } from './subjectbank'
import { subjectById } from './subjects'

export async function getContentPaper(kind, id) {
  if (kind === 'daily') return getDailyPaper(id)
  if (kind === 'subject') {
    const s = subjectById(id)
    const qs = await getSubjectQuestions(id)
    return { id, title: s ? `${s.short} — all previous years` : 'Subject practice', totalQuestions: qs.length, kind: 'subject' }
  }
  return getPaper(id)
}

export function getContentQuestions(kind, id) {
  if (kind === 'daily') return getDailyQuestions(id)
  if (kind === 'subject') return getSubjectQuestions(id)
  return getPaperQuestions(id)
}

export function paperBasePath(kind, id) {
  if (kind === 'daily') return `/app/daily/${id}`
  if (kind === 'subject') return `/app/subjects/${id}`
  return `/app/papers/${id}`
}
