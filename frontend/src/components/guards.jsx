import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

export function Splash({ label = 'Loading…' }) {
  return (
    <div className="screen-center">
      <div className="stack center gap-4">
        <div style={{ animation: 'float 2s var(--ease) infinite' }}>
          <Logo size={54} withText={false} />
        </div>
        <div className="muted">{label}</div>
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
    </div>
  )
}

// Requires a signed-in user; otherwise sends to /login and remembers where
// the user was heading so we can return them there after login.
export function RequireAuth() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Splash />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}

// Requires admin role. Non-admins are bounced to the user area.
export function RequireAdmin() {
  const { isAdmin, loading, isAuthenticated } = useAuth()
  if (loading) return <Splash />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/app" replace />
  return <Outlet />
}

// For /login and /signup: if already signed in, skip to the right home.
export function PublicOnly() {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  if (loading) return <Splash />
  if (isAuthenticated) return <Navigate to={isAdmin ? '/admin' : '/app'} replace />
  return <Outlet />
}
