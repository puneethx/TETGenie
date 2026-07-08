import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { validateEmail } from '../lib/validation'
import { isFirebaseConfigured } from '../lib/firebase'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import PasswordInput from '../components/PasswordInput'
import './auth.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [alert, setAlert] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setAlert('')
    const emailErr = validateEmail(form.email)
    const nextErrors = { email: emailErr, password: form.password ? null : 'Password is required' }
    setErrors(nextErrors)
    if (emailErr || !form.password) return
    if (!isFirebaseConfigured) {
      setAlert('Firebase is not configured yet. Add your keys to .env (see README).')
      return
    }
    setBusy(true)
    const res = await login(form)
    setBusy(false)
    if (res.ok) navigate(from || '/app', { replace: true })
    else setAlert(res.error)
  }

  return (
    <div className="auth">
      <Link to="/" className="btn btn-ghost auth-back" style={{ minHeight: 40, padding: '0 16px' }}>
        <Icon name="arrowLeft" size={18} /> Back
      </Link>

      <div className="auth-head">
        <div className="logo-wrap"><Logo size={40} withText={false} /></div>
        <h2>Welcome back</h2>
        <p>Log in to continue your TET prep</p>
      </div>

      {alert && <div className="auth-alert" role="alert">{alert}</div>}

      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            className={`input ${errors.email ? 'has-error' : ''}`}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={set('email')}
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
          />
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        <button className="btn btn-primary btn-lg btn-block mt-2" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Log in'}
        </button>
      </form>

      <p className="auth-switch">
        New to TETGenie? <Link to="/signup">Create an account</Link>
      </p>
    </div>
  )
}
