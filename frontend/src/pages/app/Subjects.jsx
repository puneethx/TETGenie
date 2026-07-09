import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SUBJECTS } from '../../lib/subjects'
import { getSubjectCounts } from '../../lib/subjectbank'
import PageHeader from '../../components/PageHeader'
import Icon from '../../components/Icon'
import './papers.css'

export default function Subjects() {
  const [counts, setCounts] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getSubjectCounts().then(setCounts).catch((e) => setError(e.message || 'Failed to load.'))
  }, [])

  return (
    <div className="page">
      <PageHeader
        title="Subject-wise practice"
        subtitle="Every previous-year question, grouped by subject · Free"
      />

      {error && <div className="auth-alert">{error}</div>}
      {!counts && !error && (
        <div className="center mt-6"><span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border-strong)' }} /></div>
      )}

      {counts && (
        <div className="stack gap-3">
          {SUBJECTS.map((s) => {
            const n = counts[s.id] || 0
            return (
              <Link key={s.id} to={n ? `/app/subjects/${s.id}` : '#'} className="paper-card" style={n ? undefined : { opacity: 0.55, pointerEvents: 'none' }}>
                <div className="pc-top">
                  <div>
                    <h3>{s.short} <span className="telugu" style={{ color: 'var(--primary)', fontSize: 'var(--fs-sm)', fontWeight: 600 }}>· {s.te}</span></h3>
                    <div className="paper-meta">
                      <span><Icon name="book" size={13} /> {n} questions</span>
                    </div>
                  </div>
                  <Icon name="chevronRight" size={18} className="faint" />
                </div>
              </Link>
            )
          })}
          {Object.values(counts).every((n) => !n) && (
            <p className="muted center mt-4">No previous-year papers uploaded yet — subject sets fill in once papers are added.</p>
          )}
        </div>
      )}
    </div>
  )
}
