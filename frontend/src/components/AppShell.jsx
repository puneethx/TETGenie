import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import Icon from './Icon'
import Logo from './Logo'
import Avatar from './Avatar'
import InstallPrompt from './InstallPrompt'
import './shell.css'

// Role-aware bottom navigation. Admins get admin destinations; users get theirs.
const USER_NAV = [
  { to: '/app', icon: 'home', label: 'Home', end: true },
  { to: '/app/papers', icon: 'book', label: 'Papers' },
  { to: '/app/daily', icon: 'calendar', label: 'Daily' },
  { to: '/app/leaderboard', icon: 'trophy', label: 'Ranks' },
  { to: '/app/account', icon: 'user', label: 'Me' },
]
const ADMIN_NAV = [
  { to: '/admin', icon: 'home', label: 'Home', end: true },
  { to: '/admin/upload', icon: 'upload', label: 'Upload' },
  { to: '/admin/generate', icon: 'sparkles', label: 'Generate' },
  { to: '/admin/users', icon: 'users', label: 'Users' },
  { to: '/app/account', icon: 'user', label: 'Me' },
]

export default function AppShell() {
  const { theme, toggleTheme } = useTheme()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const nav = isAdmin ? ADMIN_NAV : USER_NAV

  // Show a back arrow on any page that isn't a top-level nav destination.
  const rootPaths = nav.map((n) => n.to)
  const showBack = !rootPaths.includes(location.pathname)

  // Smart back: use in-app history when it exists; otherwise fall back to home
  // (this covers landing on a deep URL directly, e.g. a shared/refreshed link).
  function goBack() {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate(isAdmin ? '/admin' : '/app')
  }

  return (
    <div className="app-frame">
      <header className="topbar">
        {showBack ? (
          <button className="icon-btn" onClick={goBack} aria-label="Go back">
            <Icon name="arrowLeft" size={22} />
          </button>
        ) : (
          <button
            className="row gap-2"
            style={{ background: 'none' }}
            onClick={() => navigate(isAdmin ? '/admin' : '/app')}
            aria-label="Go home"
          >
            <Logo size={26} />
          </button>
        )}
        <div className="row gap-1">
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={21} />
          </button>
          <button
            className="icon-btn"
            onClick={() => navigate('/app/account')}
            aria-label="Account"
            style={{ padding: 0 }}
          >
            <Avatar />
          </button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <InstallPrompt />

      <nav className="bottom-nav" aria-label="Primary">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
