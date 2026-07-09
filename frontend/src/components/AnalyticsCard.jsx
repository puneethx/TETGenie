import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSubjectStats } from '../lib/analytics'
import { SUBJECTS, subjectIdForName } from '../lib/subjects'
import Icon from './Icon'

function shortFor(name) {
  const s = SUBJECTS.find((x) => x.name === name) || SUBJECTS.find((x) => subjectIdForName(name) === x.id)
  return s ? s.short : name
}
function barColor(pct) {
  if (pct >= 70) return 'var(--green-500)'
  if (pct >= 45) return 'var(--gold-500)'
  return 'var(--red-500)'
}

// Home analytics: per-subject accuracy from all attempts, with a nudge toward
// subject-wise practice for the weakest area. Hidden until the user attempts one.
export default function AnalyticsCard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    getSubjectStats().then(setStats).catch(() => setStats({}))
  }, [])

  if (!stats) return null
  const rows = Object.entries(stats)
    .map(([name, v]) => ({ name, correct: v.correct || 0, total: v.total || 0, sid: subjectIdForName(name) }))
    .filter((r) => r.total > 0)
    .map((r) => ({ ...r, pct: Math.round((r.correct / r.total) * 100) }))
  if (!rows.length) return null

  rows.sort((a, b) => a.pct - b.pct)
  const weakest = rows[0]

  return (
    <div className="card card-pad-lg mb-5">
      <div className="row gap-2" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
        <span style={{ fontWeight: 800, fontSize: 'var(--fs-lg)' }}>📊 Your performance</span>
        <Link to="/app/subjects" className="muted" style={{ fontSize: 'var(--fs-sm)', fontWeight: 700 }}>Practice →</Link>
      </div>

      <div className="stack gap-3">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-sm)', marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>{shortFor(r.name)}</span>
              <span className="muted">{r.correct}/{r.total} · {r.pct}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ width: `${r.pct}%`, height: '100%', background: barColor(r.pct), borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>

      {weakest.sid && (
        <Link
          to={`/app/subjects/${weakest.sid}`}
          className="row gap-2 mt-4"
          style={{ background: 'var(--primary-soft)', color: 'var(--primary)', padding: 'var(--sp-3)', borderRadius: 'var(--r-md)', fontWeight: 700, fontSize: 'var(--fs-sm)' }}
        >
          <Icon name="sparkles" size={16} />
          Weakest in {shortFor(weakest.name)} ({weakest.pct}%) — practice it now
          <Icon name="chevronRight" size={16} style={{ marginLeft: 'auto' }} />
        </Link>
      )}
    </div>
  )
}
