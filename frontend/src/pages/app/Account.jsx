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
          <span className="offer-ribbon">🎉 Congrats!! You are part of first 500 members</span>
          <div className="price-row">
            <span className="price-old">₹300</span>
            <span className="price"><small>₹</small>0</span>
            <span style={{ opacity: 0.9 }}>for 30 days</span>
          </div>
          {/* <span className="per-day">30 papers · just ₹10 / day</span> */}
          <span className="per-day">You will be a premium member shortly!</span>
          <ul>
            <li><span className="tick"><Icon name="check" size={12} /></span> A new 150-question paper every day for 30 days</li>
            <li><span className="tick"><Icon name="check" size={12} /></span> Attempt with answers, or exam-mode without</li>
            <li><span className="tick"><Icon name="check" size={12} /></span> Instant score, rank &amp; a shareable result card</li>
            <li><span className="tick"><Icon name="check" size={12} /></span> Retake any paper to beat your best score</li>
          </ul>
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
          style={{ width: '100%', padding: 'var(--sp-4)', justifyContent: 'space-between', background: 'none', borderBottom: '1px solid var(--border)' }}
        >
          <span className="row gap-3">
            <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={20} />
            Appearance
          </span>
          <span className="muted" style={{ textTransform: 'capitalize' }}>{theme}</span>
        </button>
        <button
          onClick={() => window.dispatchEvent(new Event('tetgenie:install'))}
          className="row gap-3"
          style={{ width: '100%', padding: 'var(--sp-4)', justifyContent: 'space-between', background: 'none' }}
        >
          <span className="row gap-3">
            <Icon name="plus" size={20} />
            Add to Home Screen
          </span>
          <Icon name="chevronRight" size={18} className="faint" />
        </button>
      </div>

      <button className="btn btn-ghost btn-block" onClick={logout} style={{ color: 'var(--red-500)' }}>
        <Icon name="logout" size={18} /> Log out
      </button>
    </div>
  )
}
