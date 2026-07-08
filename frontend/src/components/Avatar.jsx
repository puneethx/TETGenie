import { useAuth } from '../context/AuthContext'

// Circular account avatar with a subscription/role ring + corner marker.
export default function Avatar({ size }) {
  const { profile, isAdmin, isPremium } = useAuth()
  const initial = (profile?.firstName || profile?.email || '?').charAt(0).toUpperCase()
  const cls = isAdmin ? 'is-admin' : isPremium ? 'is-premium' : ''
  const style = size ? { width: size, height: size } : undefined
  return (
    <span className={`avatar ${cls}`} style={style} aria-label="Account">
      {initial}
      {isAdmin ? (
        <span className="avatar-dot" title="Admin">🛡️</span>
      ) : isPremium ? (
        <span className="avatar-dot" title="Premium">⭐</span>
      ) : null}
    </span>
  )
}
