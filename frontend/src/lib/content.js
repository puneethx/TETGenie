// Resolves a paper by "kind" so shared components (PaperView, Exam) work for
// both previous-year papers and daily papers.
import { getPaper, getPaperQuestions } from './papers'
import { getDailyPaper, getDailyQuestions } from './daily'

export function getContentPaper(kind, id) {
  return kind === 'daily' ? getDailyPaper(id) : getPaper(id)
}

export function getContentQuestions(kind, id) {
  return kind === 'daily' ? getDailyQuestions(id) : getPaperQuestions(id)
}

export function paperBasePath(kind, id) {
  return kind === 'daily' ? `/app/daily/${id}` : `/app/papers/${id}`
}
