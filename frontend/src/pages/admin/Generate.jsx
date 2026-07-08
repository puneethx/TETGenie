import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  startGeneration, waitForGeneration, regenerateQuestion, isBackendConfigured,
} from '../../lib/api'
import { loadBank } from '../../lib/papers'
import { publishDailyPaper, makeOtp } from '../../lib/daily'
import Icon from '../../components/Icon'
import PageHeader from '../../components/PageHeader'
import QuestionView from '../../components/QuestionView'
import LanguageToggle from '../../components/LanguageToggle'
import './upload.css'

const STEPS = [
  { key: 'generating', label: 'Writing questions' },
  { key: 'enriching', label: 'Removing duplicates' },
  { key: 'done', label: 'Done' },
]
const DIFFS = ['easy', 'medium', 'hard']

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function Generate() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('idle') // idle | processing | review | posting | posted | error
  const [date, setDate] = useState(today())
  const [title, setTitle] = useState('')
  const [targetBank, setTargetBank] = useState(40)
  const [bankCount, setBankCount] = useState(null)
  const [job, setJob] = useState(null)
  const [questions, setQuestions] = useState([])
  const [lang, setLang] = useState('both')
  const [error, setError] = useState('')
  const [regenIdx, setRegenIdx] = useState(null)
  const [regenBusy, setRegenBusy] = useState(null)
  const [otp, setOtp] = useState('')
  const [postedId, setPostedId] = useState('')

  async function onGenerate() {
    setError('')
    if (!isBackendConfigured) {
      setError('The AI backend URL is not set (VITE_AI_BACKEND_URL). Deploy the backend first — see the README.')
      return
    }
    setPhase('processing')
    setJob({ status: 'queued', pagesDone: 0, totalPages: 0, questionsFound: 0 })
    try {
      const bank = await loadBank()
      setBankCount(bank.length)
      const { jobId } = await startGeneration(bank, Number(targetBank))
      const final = await waitForGeneration(jobId, setJob)
      if (final.status === 'error') { setError(final.error || 'Generation failed.'); setPhase('error'); return }
      setQuestions(final.questions || [])
      setJob(final)
      setTitle((t) => t || `Daily Paper — ${date}`)
      setPhase('review')
    } catch (e) {
      setError(e.message || 'Something went wrong.')
      setPhase('error')
    }
  }

  async function regen(i, difficulty) {
    const q = questions[i]
    setRegenBusy(i)
    setRegenIdx(null)
    try {
      const avoid = questions.filter((_, k) => k !== i).map((x) => x.englishQuestion).filter(Boolean).slice(0, 8)
      const nq = await regenerateQuestion({ subject: q.subject, topic: q.topic, difficulty, avoid })
      setQuestions((qs) => qs.map((x, k) => (k === i ? {
        ...x,
        englishQuestion: nq.englishQuestion ?? x.englishQuestion,
        teluguQuestion: nq.teluguQuestion ?? x.teluguQuestion,
        options: nq.options ?? x.options,
        correctOption: nq.correctOption ?? x.correctOption,
        explanation: nq.explanation ?? x.explanation,
        explanationTelugu: nq.explanationTelugu ?? x.explanationTelugu,
        difficulty,
      } : x)))
    } catch (e) {
      setError(e.message || 'Regeneration failed.')
    } finally {
      setRegenBusy(null)
    }
  }

  async function onPost() {
    setPhase('posting')
    const code = makeOtp()
    try {
      const id = await publishDailyPaper({ date, title, questions, stats: job?.stats, otp: code })
      setOtp(code)
      setPostedId(id)
      setPhase('posted')
    } catch (e) {
      setError(e.message || 'Failed to post the paper.')
      setPhase('review')
    }
  }

  // ── PROCESSING ──
  if (phase === 'processing') {
    const total = job?.totalPages || 0
    const done = job?.pagesDone || 0
    const pct = total ? Math.round((done / total) * 100) : 5
    const statusIdx = STEPS.findIndex((s) => s.key === job?.status)
    return (
      <div className="page">
        <div className="extracting">
          <div className="extract-orb"><Icon name="sparkles" size={40} /></div>
          <h2 className="h3">Generating today's paper…</h2>
          <p className="muted">Claude is writing fresh questions grounded in your previous-year papers.</p>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          <div className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
            {job?.questionsFound || 0} questions ready
          </div>
          <div className="progress-steps">
            {STEPS.map((s, i) => (
              <span key={s.key} className={`pstep ${i === statusIdx ? 'on' : ''} ${statusIdx > i ? 'done' : ''}`}>
                {statusIdx > i ? <Icon name="check" size={12} strokeWidth={3} /> : '•'} {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── POSTED (OTP reveal) ──
  if (phase === 'posted') {
    return (
      <div className="page">
        <div className="result-card mb-4" style={{ background: 'var(--grad-gold)', color: '#3a2600' }}>
          <div style={{ fontWeight: 800 }}>Paper posted! 🎉</div>
          <p style={{ fontSize: 'var(--fs-sm)', opacity: 0.85, marginTop: 4 }}>Share this OTP with Premium members on WhatsApp</p>
          <div style={{ fontSize: '3rem', fontWeight: 850, letterSpacing: '0.15em', marginTop: 'var(--sp-3)' }}>{otp}</div>
        </div>
        <button className="btn btn-ghost btn-block mb-3" onClick={() => { navigator.clipboard?.writeText(otp); }}>
          <Icon name="share" size={18} /> Copy OTP
        </button>
        <button className="btn btn-primary btn-block" onClick={() => navigate(`/app/daily/${postedId}`)}>
          View the paper
        </button>
        <button className="btn btn-ghost btn-block mt-3" onClick={() => { setPhase('idle'); setQuestions([]); setJob(null); setDate(today()); setTitle('') }}>
          Generate another
        </button>
      </div>
    )
  }

  // ── REVIEW ──
  if (phase === 'review' || phase === 'posting') {
    const stats = job?.stats || {}
    return (
      <div className="page">
        <PageHeader title="Verify & post" subtitle={`${questions.length} questions · ${stats.bySource?.ai ?? '—'} new, ${stats.bySource?.bank ?? '—'} from bank`} />

        <div className="review-stats mb-4">
          <div className="stat-tile"><div className="n" style={{ color: 'var(--green-500)' }}>{stats.byDifficulty?.easy ?? 0}</div><div className="l">Easy</div></div>
          <div className="stat-tile"><div className="n" style={{ color: 'var(--gold-600)' }}>{stats.byDifficulty?.medium ?? 0}</div><div className="l">Medium</div></div>
          <div className="stat-tile"><div className="n" style={{ color: 'var(--red-500)' }}>{stats.byDifficulty?.hard ?? 0}</div><div className="l">Hard</div></div>
          <div className="stat-tile"><div className="n">{stats.duplicatesFlagged ?? 0}</div><div className="l">Dup flags</div></div>
        </div>

        <div className="field">
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Date</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="row" style={{ justifyContent: 'space-between', margin: 'var(--sp-4) 0 var(--sp-3)' }}>
          <span className="label" style={{ margin: 0 }}>Questions</span>
          <LanguageToggle value={lang} onChange={setLang} />
        </div>

        <div className="stack gap-4">
          {questions.map((q, i) => (
            <div key={q.id || i} style={{ position: 'relative' }}>
              <QuestionView q={q} lang={lang} showAnswer />
              <div className="row gap-2 mt-2" style={{ justifyContent: 'flex-end' }}>
                {regenIdx === i ? (
                  <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                    <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>Regenerate as:</span>
                    {DIFFS.map((d) => (
                      <button key={d} className={`q-chip diff-${d}`} style={{ cursor: 'pointer', textTransform: 'capitalize' }} onClick={() => regen(i, d)}>
                        {d}
                      </button>
                    ))}
                    <button className="q-chip" onClick={() => setRegenIdx(null)}>cancel</button>
                  </div>
                ) : (
                  <button className="btn btn-ghost" style={{ minHeight: 36, padding: '0 14px', fontSize: 'var(--fs-sm)' }} onClick={() => setRegenIdx(i)} disabled={regenBusy === i}>
                    {regenBusy === i ? <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border-strong)' }} /> : <><Icon name="sparkles" size={15} /> Regenerate</>}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="publish-bar">
          <button className="btn btn-gold btn-lg btn-block" onClick={onPost} disabled={phase === 'posting'}>
            {phase === 'posting' ? <span className="spinner" /> : <>Post paper &amp; get OTP <Icon name="lock" size={18} /></>}
          </button>
        </div>
      </div>
    )
  }

  // ── IDLE / ERROR ──
  return (
    <div className="page">
      <PageHeader title="Generate daily paper" subtitle="150 questions · AI + your previous-year bank" />
      {error && <div className="auth-alert" role="alert">{error}</div>}

      <div className="field">
        <label className="label">Paper date</label>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="field">
        <label className="label">Questions reused from previous-year bank: {targetBank}</label>
        <input type="range" min="20" max="50" value={targetBank} onChange={(e) => setTargetBank(e.target.value)} style={{ width: '100%' }} />
        <span className="help-text">The rest ({150 - targetBank}) are freshly written by Claude, weighted by topic &amp; difficulty like the real exam.</span>
      </div>

      <div className="card mt-2" style={{ fontSize: 'var(--fs-sm)' }}>
        <div className="row gap-2" style={{ color: 'var(--primary)', fontWeight: 700, marginBottom: 6 }}>
          <Icon name="sparkles" size={16} /> What happens
        </div>
        <p className="muted">
          Claude writes ~{150 - targetBank} new bilingual questions across all 5 subjects (Easy/Medium/Hard ≈ 45/75/30),
          reuses ~{targetBank} from your uploaded papers, removes duplicates, and adds answers &amp; explanations.
          You verify (and regenerate any you dislike) before posting. Posting reveals a 6-digit OTP to share.
        </p>
      </div>

      <button className="btn btn-primary btn-lg btn-block mt-5" onClick={onGenerate}>
        Generate paper <Icon name="sparkles" size={18} />
      </button>
    </div>
  )
}
