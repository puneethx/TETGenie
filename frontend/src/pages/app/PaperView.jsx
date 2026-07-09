import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { saveQuestions, deletePaper } from '../../lib/papers'
import { deleteDailyPaper, getDailyOtp, setDailyFree } from '../../lib/daily'
import { getContentPaper, getContentQuestions, paperBasePath } from '../../lib/content'
import { getAttempt } from '../../lib/attempts'
import { useAuth } from '../../context/AuthContext'
import { Splash } from '../../components/guards'
import PageHeader from '../../components/PageHeader'
import Icon from '../../components/Icon'
import QuestionView from '../../components/QuestionView'
import QuestionPager from '../../components/QuestionPager'
import LanguageToggle from '../../components/LanguageToggle'
import './papers.css'

export default function PaperView({ kind = 'py' }) {
  const { paperId } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const isDaily = kind === 'daily'

  const [paper, setPaper] = useState(null)
  const [questions, setQuestions] = useState([])
  const [attempt, setAttempt] = useState(null)
  const [otp, setOtp] = useState(null)
  const [lang, setLang] = useState('both')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [freeBusy, setFreeBusy] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([getContentPaper(kind, paperId), getContentQuestions(kind, paperId), getAttempt(paperId)])
      .then(([p, qs, at]) => { if (!alive) return; setPaper(p); setQuestions(qs); setAttempt(at) })
      .catch((e) => alive && setError(e.message || 'Failed to load paper.'))
      .finally(() => alive && setLoading(false))
    // Admins can see the OTP for a daily paper (to share on WhatsApp).
    if (isDaily && isAdmin) getDailyOtp(paperId).then((o) => alive && setOtp(o)).catch(() => {})
    return () => { alive = false }
  }, [kind, paperId, isDaily, isAdmin])

  function setCorrect(i, optIndex) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, correctOption: optIndex } : q)))
  }
  async function onSave() {
    setSaving(true)
    try { await saveQuestions(paperId, questions); setEditing(false) }
    catch (e) { setError(e.message || 'Save failed.') } finally { setSaving(false) }
  }
  async function onDelete() {
    if (!window.confirm('Delete this paper permanently?')) return
    if (isDaily) await deleteDailyPaper(paperId); else await deletePaper(paperId)
    navigate(isDaily ? '/app/daily' : '/app/papers')
  }
  async function toggleFree() {
    const next = !paper.free
    setFreeBusy(true)
    try {
      await setDailyFree(paperId, next)
      setPaper((pp) => ({ ...pp, free: next }))
    } catch (e) { setError(e.message || 'Could not update.') } finally { setFreeBusy(false) }
  }

  if (loading) return <Splash label="Downloading paper…" />
  if (error) return <div className="page"><div className="auth-alert">{error}</div></div>
  if (!paper) return <div className="page"><p className="muted center mt-6">Paper not found.</p></div>

  return (
    <div className="page">
      <PageHeader title={paper.title || 'Paper'} subtitle={`${questions.length} questions · Telugu & English`} />

      {/* Admin: OTP for this daily paper */}
      {isDaily && isAdmin && otp && (
        <div className="card mb-4" style={{ background: 'var(--grad-gold)', color: '#3a2600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700 }}>Exam OTP (share on WhatsApp)</div>
            <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 850, letterSpacing: '0.12em' }}>{otp}</div>
          </div>
          <button className="icon-btn" onClick={() => navigator.clipboard?.writeText(otp)} aria-label="Copy OTP"><Icon name="share" size={20} /></button>
        </div>
      )}

      {attempt && (
        <div className="card mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 'var(--fs-lg)' }}>Best: {attempt.bestScore}/{attempt.total}</div>
            <div className="muted" style={{ fontSize: 'var(--fs-sm)' }}>Attempted {attempt.attempts}× · beat your best!</div>
          </div>
          <Icon name="trophy" size={26} className="faint" />
        </div>
      )}

      <div className="stack gap-3 mb-4">
        <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate(`${paperBasePath(kind, paperId)}/exam?mode=practice`)}>
          <Icon name="book" size={18} /> Practice (see answers as you go)
        </button>
        <button className="btn btn-ghost btn-lg btn-block" onClick={() => navigate(`${paperBasePath(kind, paperId)}/exam?mode=exam`)}>
          <Icon name="calendar" size={18} /> Exam mode (answers at the end)
        </button>
      </div>

      {isAdmin && (
        <div className="card mb-4 stack gap-3">
          <div className="row gap-2" style={{ justifyContent: 'space-between' }}>
            <span className="badge badge-admin"><Icon name="shield" size={12} /> Admin</span>
            <div className="row gap-2">
              {!isDaily && (editing ? (
                <button className="btn btn-primary" style={{ minHeight: 40 }} onClick={onSave} disabled={saving}>
                  {saving ? <span className="spinner" /> : 'Save changes'}
                </button>
              ) : (
                <button className="btn btn-ghost" style={{ minHeight: 40 }} onClick={() => setEditing(true)}>Edit answers</button>
              ))}
              <button className="btn btn-ghost" style={{ minHeight: 40, color: 'var(--red-500)' }} onClick={onDelete}>Delete</button>
            </div>
          </div>
          {isDaily && (
            <div className="row gap-3" style={{ justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-3)' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{paper.free ? 'Free for everyone' : 'Premium only'}</div>
                <div className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
                  {paper.free ? 'Anyone can open this paper — no OTP needed.' : 'Make it free to let all users try a sample.'}
                </div>
              </div>
              <button className={`btn ${paper.free ? 'btn-ghost' : 'btn-gold'}`} style={{ minHeight: 40, padding: '0 14px', flex: 'none' }} onClick={toggleFree} disabled={freeBusy}>
                {freeBusy ? <span className="spinner" /> : paper.free ? 'Make Premium' : 'Make Free'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
        <span className="label" style={{ margin: 0 }}>Answer key & explanations</span>
        <LanguageToggle value={lang} onChange={setLang} />
      </div>

      <QuestionPager
        items={questions}
        pageSize={20}
        renderItem={(q, i) => (
          <QuestionView key={q.id || i} q={q} lang={lang} showAnswer editable={editing} onSetCorrect={(o) => setCorrect(i, o)} />
        )}
      />
    </div>
  )
}
