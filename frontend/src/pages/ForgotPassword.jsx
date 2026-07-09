import { useState } from 'react'
import { Link } from 'react-router-dom'
import { resetPassword } from '../lib/api'
import { validateEmail, validatePassword, validateConfirm } from '../lib/validation'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import PasswordInput from '../components/PasswordInput'
import './auth.css'

const WHATSAPP_URL = import.meta.env.VITE_WHATSAPP_COMMUNITY_URL || '#'

export default function ForgotPassword() {
  const [form, setForm] = useState({ email: '', code: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [alert, setAlert] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setAlert('')
    const next = {
      email: validateEmail(form.email),
      code: form.code.trim() ? null : 'Enter the reset code from the admin',
      password: validatePassword(form.password),
      confirm: validateConfirm(form.password, form.confirm),
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    setBusy(true)
    try {
      await resetPassword({ email: form.email, code: form.code.trim(), newPassword: form.password })
      setDone(true)
    } catch (err) {
      setAlert(err.message || 'Could not reset password.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="auth">
        <div className="auth-head">
          <div className="logo-wrap"><Logo size={40} withText={false} /></div>
          <h2>Password updated ✅</h2>
          <p>You can now log in with your new password.</p>
        </div>
        <Link to="/login" className="btn btn-primary btn-lg btn-block">Go to login</Link>
      </div>
    )
  }

  return (
    <div className="auth">
      <Link to="/login" className="btn btn-ghost auth-back" style={{ minHeight: 40, padding: '0 16px' }}>
        <Icon name="arrowLeft" size={18} /> Back to login
      </Link>

      <div className="auth-head">
        <div className="logo-wrap"><Logo size={40} withText={false} /></div>
        <h2>Reset your password</h2>
        <p>Enter the reset code the admin shares on WhatsApp, then set a new password.</p>
      </div>

      <div className="auth-alert" style={{ background: 'var(--primary-soft)', color: 'var(--primary)', borderColor: 'var(--primary-soft-border)' }}>
        Don't have a reset code?{' '}
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" style={{ fontWeight: 700, textDecoration: 'underline' }}>
          Ask on the WhatsApp community
        </a>.
      </div>

      {alert && <div className="auth-alert" role="alert">{alert}</div>}

      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className={`input ${errors.email ? 'has-error' : ''}`} type="email" inputMode="email"
                 autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="code">Reset code</label>
          <input id="code" className={`input ${errors.code ? 'has-error' : ''}`} placeholder="Code from admin"
                 value={form.code} onChange={set('code')} autoCapitalize="characters" />
          {errors.code && <span className="error-text">{errors.code}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="password">New password</label>
          <PasswordInput id="password" autoComplete="new-password" placeholder="At least 8 chars, 1 uppercase"
                         value={form.password} onChange={set('password')} error={errors.password} />
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="confirm">Confirm new password</label>
          <PasswordInput id="confirm" autoComplete="new-password" placeholder="Re-enter new password"
                         value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
          {errors.confirm && <span className="error-text">{errors.confirm}</span>}
        </div>

        <button className="btn btn-primary btn-lg btn-block mt-2" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Reset password'}
        </button>
      </form>
    </div>
  )
}
