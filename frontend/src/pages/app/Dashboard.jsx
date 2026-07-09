import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Icon from '../../components/Icon'
import AnalyticsCard from '../../components/AnalyticsCard'

const TILES = [
  { to: '/app/papers', icon: 'book', title: 'Previous-year papers', desc: 'Free for everyone', tag: 'Free', tone: 'green' },
  { to: '/app/subjects', icon: 'sparkles', title: 'Subject-wise practice', desc: 'Practice one subject at a time', tag: 'Free', tone: 'green' },
  { to: '/app/daily', icon: 'calendar', title: 'Daily mock papers', desc: 'A new paper every day', tag: 'Premium', tone: 'gold' },
  { to: '/app/leaderboard', icon: 'trophy', title: 'Leaderboard', desc: 'See your rank', tag: null },
]

export default function Dashboard() {
  const { profile, isPremium, isAdmin } = useAuth()
  // Admins have their own control centre.
  if (isAdmin) return <Navigate to="/admin" replace />
  const name = profile?.firstName || 'there'

  return (
    <div className="page">
      <div className="mb-4">
        <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>Welcome back,</p>
        <h1 className="h2">Namaste, {name} 👋</h1>
      </div>

      {/* Subscription status strip */}
      <div
        className="card"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)',
          background: isPremium ? 'var(--grad-gold)' : 'var(--surface)',
          color: isPremium ? '#3a2600' : 'var(--text)',
          border: isPremium ? 'none' : '1px solid var(--border)',
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 'var(--fs-lg)' }}>
            {isPremium ? '⭐ Premium member' : 'Free plan'}
          </div>
          <div style={{ fontSize: 'var(--fs-sm)', opacity: 0.85 }}>
            {isPremium ? 'Daily papers unlocked' : 'Upgrade for daily mock papers'}
          </div>
        </div>
        {!isPremium && (
          <Link to="/app/account" className="btn btn-primary" style={{ minHeight: 42 }}>
            Upgrade
          </Link>
        )}
      </div>

      <AnalyticsCard />

      <div className="stack gap-3">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to} className="card row gap-3" style={{ justifyContent: 'space-between' }}>
            <div className="row gap-3">
              <span
                className="f-icon"
                style={{
                  width: 46, height: 46, borderRadius: 'var(--r-md)', display: 'grid',
                  placeItems: 'center', background: 'var(--primary-soft)', color: 'var(--primary)', flex: 'none',
                }}
              >
                <Icon name={t.icon} size={22} />
              </span>
              <div>
                <div style={{ fontWeight: 700 }}>{t.title}</div>
                <div className="muted" style={{ fontSize: 'var(--fs-sm)' }}>{t.desc}</div>
              </div>
            </div>
            <div className="row gap-2">
              {t.tag && (
                <span className={`badge ${t.tone === 'green' ? 'badge-premium' : t.tone === 'gold' ? 'badge-premium' : 'badge-free'}`}
                      style={t.tone === 'green' ? { background: 'var(--green-500)', color: '#fff' } : undefined}>
                  {t.tag}
                </span>
              )}
              <Icon name="chevronRight" size={18} className="faint" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
