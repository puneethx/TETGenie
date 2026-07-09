import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDailyPaper, unlockDaily } from '../lib/daily'
import { Splash } from './guards'
import Icon from './Icon'

const WHATSAPP_URL = import.meta.env.VITE_WHATSAPP_COMMUNITY_URL || '#'

// Guards a daily paper: Premium-only, then OTP-unlock. Admins pass through.
export default function DailyGate({ children }) {
  const { paperId } = useParams()
  const { profile, isPremium, isAdmin } = useAuth()

  const [paper, setPaper] = useState(null)
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [unlockedLocal, setUnlockedLocal] = useState(false)

  useEffect(() => {
    getDailyPaper(paperId).then(setPaper).finally(() => setLoading(false))
  }, [paperId])

  const unlocked = isAdmin || paper?.free || unlockedLocal || (profile?.unlockedExams || []).includes(paperId)

  if (loading) return <Splash label="Loading…" />
  if (unlocked) return children

  // Free users: premium upsell
  if (!isPremium) {
    return (
      <div className="page">
        <div className="offer" style={{ marginTop: 'var(--sp-5)' }}>
          <div style={{ fontWeight: 800, fontSize: 'var(--fs-xl)' }}>🔒 Premium daily paper</div>
          <p style={{ opacity: 0.92, fontSize: 'var(--fs-sm)', marginTop: 6 }}>
            {paper?.title || 'This daily mock paper'} is for Premium members. Unlock a fresh
            150-question paper every day for ₹149/30 days (₹5/day).
          </p>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="btn btn-gold btn-block mt-4">
            <Icon name="share" size={18} /> Join WhatsApp community to request Premium
          </a>
        </div>
      </div>
    )
  }

  // Premium, not yet unlocked: ask for OTP
  async function onUnlock(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const ok = await unlockDaily(paperId, code)
      if (ok) setUnlockedLocal(true)
      else setErr('Incorrect OTP. Check the code shared in the WhatsApp community.')
    } catch (e2) {
      setErr(e2.message || 'Could not verify OTP.')
    } finally { setBusy(false) }
  }

  return (
    <div className="page">
      <div className="card card-pad-lg center stack gap-3" style={{ alignItems: 'center', marginTop: 'var(--sp-5)' }}>
        <span style={{ width: 60, height: 60, borderRadius: 'var(--r-lg)', display: 'grid', placeItems: 'center', background: 'var(--primary-soft)', color: 'var(--primary)' }}>
          <Icon name="lock" size={28} />
        </span>
        <h2 className="h3">{paper?.title || 'Daily paper'}</h2>
        <p className="muted" style={{ maxWidth: '32ch' }}>
          Enter the 6-digit OTP shared in the TETGenie WhatsApp community to open this exam.
        </p>
        {err && <div className="auth-alert" style={{ width: '100%' }}>{err}</div>}
        <form onSubmit={onUnlock} style={{ width: '100%' }}>
          <input
            className="input center"
            inputMode="numeric"
            maxLength={6}
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            style={{ fontSize: 'var(--fs-2xl)', letterSpacing: '0.3em', fontWeight: 800 }}
          />
          <button className="btn btn-primary btn-lg btn-block mt-4" disabled={busy || code.length !== 6}>
            {busy ? <span className="spinner" /> : <>Unlock exam <Icon name="lock" size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  )
}
