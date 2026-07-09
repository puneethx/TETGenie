import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { subjectById } from '../../lib/subjects'
import { getSubjectQuestions } from '../../lib/subjectbank'
import { getAttempt } from '../../lib/attempts'
import { Splash } from '../../components/guards'
import PageHeader from '../../components/PageHeader'
import Icon from '../../components/Icon'
import './papers.css'

export default function SubjectView() {
  const { subjectId } = useParams()
  const navigate = useNavigate()
  const s = subjectById(subjectId)

  const [count, setCount] = useState(null)
  const [attempt, setAttempt] = useState(null)

  useEffect(() => {
    let alive = true
    getSubjectQuestions(subjectId).then((qs) => alive && setCount(qs.length))
    getAttempt(subjectId).then((a) => alive && setAttempt(a)).catch(() => {})
    return () => { alive = false }
  }, [subjectId])

  if (!s) return <div className="page"><p className="muted center mt-6">Unknown subject.</p></div>
  if (count == null) return <Splash label="Loading questions…" />

  return (
    <div className="page">
      <PageHeader title={`${s.short} practice`} subtitle={`${count} questions from all previous-year papers`} />

      {count === 0 ? (
        <p className="muted center mt-6">No {s.short} questions yet — upload more previous-year papers.</p>
      ) : (
        <>
          {attempt && (
            <div className="card mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 'var(--fs-lg)' }}>Best: {attempt.bestScore}/{attempt.total}</div>
                <div className="muted" style={{ fontSize: 'var(--fs-sm)' }}>Attempted {attempt.attempts}× · beat your best!</div>
              </div>
              <Icon name="trophy" size={26} className="faint" />
            </div>
          )}

          <div className="card mb-4" style={{ fontSize: 'var(--fs-sm)' }}>
            <div className="row gap-2" style={{ color: 'var(--primary)', fontWeight: 700, marginBottom: 6 }}>
              <Icon name="sparkles" size={16} /> {s.short} · {s.te}
            </div>
            <p className="muted">
              Practice only {s.short} — {count} bilingual questions pulled from every uploaded paper. Scored, with a
              shareable result, just like a full exam.
            </p>
          </div>

          <div className="stack gap-3">
            <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate(`/app/subjects/${subjectId}/exam?mode=practice`)}>
              <Icon name="book" size={18} /> Practice (see answers as you go)
            </button>
            <button className="btn btn-ghost btn-lg btn-block" onClick={() => navigate(`/app/subjects/${subjectId}/exam?mode=exam`)}>
              <Icon name="calendar" size={18} /> Exam mode (answers at the end)
            </button>
          </div>
        </>
      )}
    </div>
  )
}
