import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPapers } from '../../lib/papers'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader'
import Icon from '../../components/Icon'
import './papers.css'

function DiffBar({ byDifficulty = {}, total }) {
  const t = total || (byDifficulty.easy || 0) + (byDifficulty.medium || 0) + (byDifficulty.hard || 0) || 1
  const pct = (n) => `${((n || 0) / t) * 100}%`
  return (
    <div className="diffbar" title="Difficulty mix">
      <div className="seg-easy" style={{ width: pct(byDifficulty.easy) }} />
      <div className="seg-medium" style={{ width: pct(byDifficulty.medium) }} />
      <div className="seg-hard" style={{ width: pct(byDifficulty.hard) }} />
    </div>
  )
}

export default function Papers() {
  const { isAdmin } = useAuth()
  const [papers, setPapers] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listPapers().then(setPapers).catch((e) => setError(e.message || 'Failed to load papers.'))
  }, [])

  return (
    <div className="page">
      <PageHeader
        title="Previous-year papers"
        subtitle="Free for everyone · Telugu & English"
      />

      {error && <div className="auth-alert">{error}</div>}

      {!papers && !error && (
        <div className="center mt-6"><span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border-strong)' }} /></div>
      )}

      {papers && papers.length === 0 && (
        <div className="card card-pad-lg center stack gap-3" style={{ alignItems: 'center', marginTop: 'var(--sp-5)' }}>
          <span style={{ width: 60, height: 60, borderRadius: 'var(--r-lg)', display: 'grid', placeItems: 'center', background: 'var(--primary-soft)', color: 'var(--primary)' }}>
            <Icon name="book" size={28} />
          </span>
          <h3 className="h3">No papers yet</h3>
          <p className="muted">{isAdmin ? 'Upload a previous-year paper to get started.' : 'Papers will appear here soon. Check back shortly!'}</p>
          {isAdmin && <Link to="/admin/upload" className="btn btn-primary mt-2"><Icon name="upload" size={18} /> Upload a paper</Link>}
        </div>
      )}

      <div className="stack gap-3">
        {papers?.map((p) => (
          <Link key={p.id} to={`/app/papers/${p.id}`} className="paper-card">
            <div className="pc-top">
              <div>
                <h3>{p.title || `Previous Year ${p.year || ''}`}</h3>
                <div className="paper-meta">
                  <span><Icon name="book" size={13} /> {p.totalQuestions || 0} questions</span>
                  {p.year && <span>📅 {p.year}</span>}
                </div>
              </div>
              <span className="badge badge-premium" style={{ background: 'var(--green-500)', color: '#fff', flex: 'none' }}>Free</span>
            </div>
            <DiffBar byDifficulty={p.stats?.byDifficulty} total={p.totalQuestions} />
          </Link>
        ))}
      </div>
    </div>
  )
}
