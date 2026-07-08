import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listDailyPapers } from '../../lib/daily'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader'
import Icon from '../../components/Icon'
import './papers.css'

const WHATSAPP_URL = import.meta.env.VITE_WHATSAPP_COMMUNITY_URL || '#'

function fmtDate(d) {
  if (!d) return ''
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  } catch { return d }
}

export default function Daily() {
  const { profile, isPremium, isAdmin } = useAuth()
  const [papers, setPapers] = useState(null)
  const [error, setError] = useState('')
  const unlocked = new Set(profile?.unlockedExams || [])

  useEffect(() => {
    listDailyPapers().then(setPapers).catch((e) => setError(e.message || 'Failed to load daily papers.'))
  }, [])

  return (
    <div className="page">
      <PageHeader
        title="Daily papers"
        subtitle={isPremium ? 'A fresh 150-question paper every day' : 'Premium members only'}
      />

      {!isPremium && !isAdmin && (
        <div className="offer" style={{ marginBottom: 'var(--sp-5)' }}>
          <div style={{ fontWeight: 800, fontSize: 'var(--fs-lg)' }}>🔒 Unlock daily papers</div>
          <p style={{ opacity: 0.92, fontSize: 'var(--fs-sm)', marginTop: 4 }}>₹149 for 30 papers · just ₹5/day.</p>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="btn btn-gold btn-block mt-4">
            <Icon name="share" size={18} /> Join WhatsApp community to buy
          </a>
        </div>
      )}

      {error && <div className="auth-alert">{error}</div>}
      {!papers && !error && (
        <div className="center mt-6"><span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border-strong)' }} /></div>
      )}

      {papers && papers.length === 0 && (
        <div className="card card-pad-lg center stack gap-3" style={{ alignItems: 'center', marginTop: 'var(--sp-4)' }}>
          <span style={{ width: 56, height: 56, borderRadius: 'var(--r-lg)', display: 'grid', placeItems: 'center', background: 'var(--primary-soft)', color: 'var(--primary)' }}>
            <Icon name="calendar" size={26} />
          </span>
          <p className="muted">{isAdmin ? 'No daily papers yet — generate one!' : 'No daily papers posted yet. Check back soon!'}</p>
          {isAdmin && <Link to="/admin/generate" className="btn btn-primary mt-2"><Icon name="sparkles" size={18} /> Generate a paper</Link>}
        </div>
      )}

      <div className="stack gap-3">
        {papers?.map((p) => {
          const isUnlocked = isAdmin || unlocked.has(p.id)
          return (
            <Link key={p.id} to={`/app/daily/${p.id}`} className="paper-card">
              <div className="pc-top">
                <div>
                  <h3>{p.title || 'Daily Paper'}</h3>
                  <div className="paper-meta">
                    <span><Icon name="calendar" size={13} /> {fmtDate(p.date)}</span>
                    <span><Icon name="book" size={13} /> {p.totalQuestions || 150} questions</span>
                  </div>
                </div>
                <span className={`badge ${isUnlocked ? 'badge-premium' : 'badge-free'}`} style={isUnlocked ? { background: 'var(--green-500)', color: '#fff' } : undefined}>
                  {isUnlocked ? 'Open' : <><Icon name="lock" size={11} /> Locked</>}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
