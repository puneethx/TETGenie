import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isFirebaseConfigured } from '../lib/firebase'
import {
  validateEmail,
  validatePassword,
  validateConfirm,
  validateFirstName,
  validatePhone,
  passwordStrength,
} from '../lib/validation'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import PasswordInput from '../components/PasswordInput'
import './auth.css'

const METER_COLORS = ['#dc2626', '#dc2626', '#f59e0b', '#8b5cf6', '#16a34a']

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [errors, setErrors] = useState({})
  const [alert, setAlert] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const strength = passwordStrength(form.password)

  function validateAll() {
    return {
      firstName: validateFirstName(form.firstName),
      phone: validatePhone(form.phone),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirm: validateConfirm(form.password, form.confirm),
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    setAlert('')
    const next = validateAll()
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    if (!isFirebaseConfigured) {
      setAlert('Firebase is not configured yet. Add your keys to .env (see README).')
      return
    }
    setBusy(true)
    const res = await signup(form)
    setBusy(false)
    if (res.ok) navigate('/app', { replace: true })
    else setAlert(res.error)
  }

  const reqs = [
    { key: 'length', label: 'At least 8 characters', met: strength.checks.length },
    { key: 'uppercase', label: 'One uppercase letter (A–Z)', met: strength.checks.uppercase },
  ]

  return (
    <div className="auth">
      <Link to="/" className="btn btn-ghost auth-back" style={{ minHeight: 40, padding: '0 16px' }}>
        <Icon name="arrowLeft" size={18} /> Back
      </Link>

      <div className="auth-head">
        <div className="logo-wrap"><Logo size={40} withText={false} /></div>
        <h2>Create your account</h2>
        <p>Start with free previous-year papers</p>
      </div>

      {alert && <div className="auth-alert" role="alert">{alert}</div>}

      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <div className="name-row">
          <div className="field">
            <label className="label" htmlFor="firstName">
              First name <span className="req">*</span>
            </label>
            <input
              id="firstName"
              className={`input ${errors.firstName ? 'has-error' : ''}`}
              autoComplete="given-name"
              placeholder="First"
              value={form.firstName}
              onChange={set('firstName')}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="lastName">Last name</label>
            <input
              id="lastName"
              className="input"
              autoComplete="family-name"
              placeholder="Optional"
              value={form.lastName}
              onChange={set('lastName')}
            />
          </div>
        </div>
        {errors.firstName && (
          <span className="error-text" style={{ marginTop: 'calc(-1 * var(--sp-2))', marginBottom: 'var(--sp-3)' }}>
            {errors.firstName}
          </span>
        )}

        <div className="field">
          <label className="label" htmlFor="phone">Phone number <span className="req">*</span></label>
          <input
            id="phone"
            className={`input ${errors.phone ? 'has-error' : ''}`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="10-digit mobile number"
            value={form.phone}
            onChange={set('phone')}
          />
          {errors.phone && <span className="error-text">{errors.phone}</span>}
        </div>

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
            autoComplete="new-password"
            placeholder="Create a password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
          />
          {form.password && (
            <div className="strength" data-score={strength.score} style={{ '--meter-color': METER_COLORS[strength.score] }}>
              <div className="strength-bars">
                <span /><span /><span /><span />
              </div>
              <div className="strength-label" style={{ color: METER_COLORS[strength.score] }}>
                {strength.label}
              </div>
            </div>
          )}
          <div className="req-list">
            {reqs.map((r) => (
              <div key={r.key} className={`req-item ${r.met ? 'met' : ''}`}>
                <span className="rc">{r.met && <Icon name="check" size={9} strokeWidth={3} />}</span>
                {r.label}
              </div>
            ))}
          </div>
          {errors.password && <span className="error-text mt-2">{errors.password}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="confirm">Confirm password</label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={form.confirm}
            onChange={set('confirm')}
            error={errors.confirm}
          />
          {errors.confirm && <span className="error-text">{errors.confirm}</span>}
        </div>

        <button className="btn btn-primary btn-lg btn-block mt-2" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}
