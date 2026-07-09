import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Icon from '../../components/Icon'
import Avatar from '../../components/Avatar'

const WHATSAPP_URL = import.meta.env.VITE_WHATSAPP_COMMUNITY_URL || '#'

export default function Account() {
  const { profile, isAdmin, isPremium, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'TET Aspirant'

  return (
    <div className="page">
      {/* Identity card */}
      <div className="card card-pad-lg row gap-4" style={{ marginBottom: 'var(--sp-5)' }}>
        <Avatar size={60} />
        <div className="grow" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 'var(--fs-lg)' }}>{fullName}</div>
          <div className="muted" style={{ fontSize: 'var(--fs-sm)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {profile?.email}
          </div>
          <div className="row gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
            {isAdmin && <span className="badge badge-admin"><Icon name="shield" size={12} /> Admin</span>}
            <span className={`badge ${isPremium ? 'badge-premium' : 'badge-free'}`}>
              {isPremium ? '⭐ Premium' : 'Free plan'}
            </span>
          </div>
        </div>
      </div>

      {/* Premium upsell (free users only) */}
      {!isPremium && (
        <div className="offer" style={{ margin: '0 0 var(--sp-5)' }}>
          <div style={{ fontWeight: 800, fontSize: 'var(--fs-xl)' }}>Go Premium — ₹149 / 30 days</div>
          <p style={{ opacity: 0.92, fontSize: 'var(--fs-sm)', marginTop: 4 }}>
            Unlock a fresh 150-question mock paper every day. Just ₹5/day.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="btn btn-gold btn-block mt-4"
          >
            <Icon name="share" size={18} /> Join WhatsApp community
          </a>
          <p style={{ opacity: 0.85, fontSize: 'var(--fs-xs)', marginTop: 'var(--sp-3)', textAlign: 'center' }}>
            After payment, your account is upgraded to Premium.
          </p>
        </div>
      )}

      {/* Settings */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--sp-5)' }}>
        <button
          onClick={toggleTheme}
          className="row gap-3"
          style={{ width: '100%', padding: 'var(--sp-4)', justifyContent: 'space-between', background: 'none' }}
        >
          <span className="row gap-3">
            <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={20} />
            Appearance
          </span>
          <span className="muted" style={{ textTransform: 'capitalize' }}>{theme}</span>
        </button>
      </div>

      <button className="btn btn-ghost btn-block" onClick={logout} style={{ color: 'var(--red-500)' }}>
        <Icon name="logout" size={18} /> Log out
      </button>
    </div>
  )
}
