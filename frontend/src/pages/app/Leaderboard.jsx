import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listPapers } from '../../lib/papers'
import { listDailyPapers } from '../../lib/daily'
import { getLeaderboard } from '../../lib/leaderboard'
import { getContentPaper } from '../../lib/content'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader'
import Icon from '../../components/Icon'

const MEDAL = ['🥇', '🥈', '🥉']

function kindOf(id) {
  return id?.startsWith('daily-') ? 'daily' : 'py'
}

export default function Leaderboard() {
  const [params, setParams] = useSearchParams()
  const paperId = params.get('paper')
  const { profile } = useAuth()

  const [papers, setPapers] = useState(null)
  const [rows, setRows] = useState(null)
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  // Picker: all papers
  useEffect(() => {
    if (paperId) return
    Promise.all([listPapers().catch(() => []), listDailyPapers().catch(() => [])])
      .then(([a, b]) => setPapers([...a, ...b]))
      .catch((e) => setError(e.message || 'Failed to load.'))
  }, [paperId])

  // Board for a specific paper
  useEffect(() => {
    if (!paperId) return
    setRows(null)
    getContentPaper(kindOf(paperId), paperId).then((p) => setTitle(p?.title || 'Paper')).catch(() => {})
    getLeaderboard(paperId).then(setRows).catch((e) => setError(e.message || 'Failed to load leaderboard.'))
  }, [paperId])

  if (!paperId) {
    return (
      <div className="page">
        <PageHeader title="Leaderboard" subtitle="Pick a paper to see rankings" />
        {error && <div className="auth-alert">{error}</div>}
        {!papers && !error && <div className="center mt-6"><span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border-strong)' }} /></div>}
        {papers && papers.length === 0 && <p className="muted center mt-6">No papers yet.</p>}
        <div className="stack gap-3">
          {papers?.map((p) => (
            <button key={p.id} className="paper-card row" style={{ justifyContent: 'space-between', textAlign: 'left' }} onClick={() => setParams({ paper: p.id })}>
              <span style={{ fontWeight: 700 }}>{p.title || 'Paper'}</span>
              <Icon name="chevronRight" size={18} className="faint" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <button className="btn btn-ghost auth-back mb-4" style={{ minHeight: 40, padding: '0 14px' }} onClick={() => setParams({})}>
        <Icon name="arrowLeft" size={18} /> All papers
      </button>
      <PageHeader title="Leaderboard" subtitle={title} />

      {error && <div className="auth-alert">{error}</div>}
      {!rows && !error && <div className="center mt-6"><span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border-strong)' }} /></div>}

      {rows && rows.length === 0 && (
        <div className="card card-pad-lg center stack gap-2" style={{ alignItems: 'center', marginTop: 'var(--sp-4)' }}>
          <Icon name="trophy" size={30} className="faint" />
          <p className="muted">No scores posted yet. Be the first — attempt this paper and post your score!</p>
        </div>
      )}

      <div className="stack gap-2">
        {rows?.map((r, i) => {
          const me = r.uid === profile?.uid
          return (
            <div key={r.uid} className="card row gap-3" style={{ justifyContent: 'space-between', padding: 'var(--sp-3) var(--sp-4)', border: me ? '1.5px solid var(--primary)' : undefined }}>
              <div className="row gap-3" style={{ minWidth: 0 }}>
                <span style={{ width: 28, textAlign: 'center', fontWeight: 800, fontSize: 'var(--fs-lg)' }}>{MEDAL[i] || i + 1}</span>
                <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name}{me && <span className="muted"> (you)</span>}
                </span>
              </div>
              <div className="row gap-2" style={{ flex: 'none' }}>
                <span style={{ fontWeight: 800 }}>{r.score}/{r.total}</span>
                <span className="q-chip">{r.pct}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
