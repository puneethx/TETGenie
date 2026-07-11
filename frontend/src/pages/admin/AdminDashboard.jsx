import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Icon from '../../components/Icon'

const ACTIONS = [
  { to: '/admin/upload', icon: 'upload', title: 'Upload question paper', desc: 'PDF → Claude Vision → structured questions in Telugu & English', tone: 'brand' },
  { to: '/admin/generate', icon: 'sparkles', title: 'Generate daily paper', desc: 'Create a fresh 150-question mock paper with AI', tone: 'gold' },
  { to: '/admin/users', icon: 'users', title: 'Manage users', desc: 'View all users; mark paid users as Premium', tone: 'brand' },
  { to: '/app/papers', icon: 'book', title: 'Previous-year papers', desc: 'Browse, review & edit uploaded previous-year papers', tone: 'brand' },
  { to: '/app/daily', icon: 'calendar', title: 'Daily papers', desc: 'View posted daily papers, their OTPs & delete', tone: 'gold' },
  { to: '/app/subjects', icon: 'book', title: 'Subject-wise questions', desc: 'Browse all previous-year questions grouped by subject', tone: 'brand' },
]

export default function AdminDashboard() {
  const { profile } = useAuth()
  return (
    <div className="page">
      <div className="mb-4">
        <span className="badge badge-admin mb-2"><Icon name="shield" size={12} /> Admin</span>
        <h1 className="h2">Control centre</h1>
        <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
          Signed in as {profile?.firstName || profile?.email}
        </p>
      </div>

      <div className="stack gap-3">
        {ACTIONS.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="card card-pad-lg row gap-4"
            style={{ justifyContent: 'space-between' }}
          >
            <div className="row gap-4">
              <span
                style={{
                  width: 52, height: 52, borderRadius: 'var(--r-md)', display: 'grid', placeItems: 'center', flex: 'none',
                  background: a.tone === 'gold' ? 'var(--grad-gold)' : 'var(--grad-brand)', color: a.tone === 'gold' ? '#3a2600' : '#fff',
                }}
              >
                <Icon name={a.icon} size={26} />
              </span>
              <div>
                <div style={{ fontWeight: 750 }}>{a.title}</div>
                <div className="muted" style={{ fontSize: 'var(--fs-sm)' }}>{a.desc}</div>
              </div>
            </div>
            <Icon name="chevronRight" size={20} className="faint" />
          </Link>
        ))}
      </div>
    </div>
  )
}
