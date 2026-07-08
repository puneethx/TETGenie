import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getContentPaper, getContentQuestions, paperBasePath } from '../../lib/content'
import { saveAttempt } from '../../lib/attempts'
import { postScore, getLeaderboard } from '../../lib/leaderboard'
import { useAuth } from '../../context/AuthContext'
import { Splash } from '../../components/guards'
import Icon from '../../components/Icon'
import QuestionView from '../../components/QuestionView'
import LanguageToggle from '../../components/LanguageToggle'
import ResultShareCard from '../../components/ResultShareCard'
import './papers.css'

function fmt(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Exam({ kind = 'py' }) {
  const { paperId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const mode = params.get('mode') === 'exam' ? 'exam' : 'practice'

  const [paper, setPaper] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState({})
  const [lang, setLang] = useState('both')
  const [showPalette, setShowPalette] = useState(false)
  const [phase, setPhase] = useState('exam')
  const [result, setResult] = useState(null)
  const [startTs] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)

  const [topPct, setTopPct] = useState(null)
  const [posted, setPosted] = useState(false)
  const [postBusy, setPostBusy] = useState(false)
  const cardRef = useRef(null)

  useEffect(() => {
    Promise.all([getContentPaper(kind, paperId), getContentQuestions(kind, paperId)])
      .then(([p, qs]) => { setPaper(p); setQuestions(qs) })
      .finally(() => setLoading(false))
  }, [kind, paperId])

  useEffect(() => {
    if (phase !== 'exam') return
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTs) / 1000)), 1000)
    return () => clearInterval(t)
  }, [phase, startTs])

  const q = questions[idx]
  const answeredCount = Object.keys(answers).length
  const backPath = paperBasePath(kind, paperId)

  function choose(optIndex) {
    if (!q) return
    if (mode === 'practice' && revealed[q.id]) return
    setAnswers((a) => ({ ...a, [q.id]: optIndex }))
    if (mode === 'practice') setRevealed((r) => ({ ...r, [q.id]: true }))
  }

  function grade() {
    let correct = 0, wrong = 0, skipped = 0
    for (const qq of questions) {
      const a = answers[qq.id]
      if (a == null) skipped++
      else if (a === qq.correctOption) correct++
      else wrong++
    }
    return { correct, wrong, skipped, total: questions.length, timeSec: Math.floor((Date.now() - startTs) / 1000) }
  }

  async function submit() {
    const remaining = questions.length - answeredCount
    if (remaining > 0 && !window.confirm(`${remaining} question(s) unanswered. Submit anyway?`)) return
    const r = grade()
    setResult(r)
    setPhase('result')
    window.scrollTo(0, 0)
    try { await saveAttempt({ paperId, paperTitle: paper?.title || '', score: r.correct, total: r.total }) } catch { /* */ }
    // Compute an approximate "top %" from the opt-in leaderboard.
    try {
      const board = await getLeaderboard(paperId)
      const better = board.filter((s) => s.score > r.correct).length
      const pool = board.length + (board.some((s) => s.uid === profile?.uid) ? 0 : 1)
      setTopPct(Math.max(1, Math.round(((better + 1) / pool) * 100)))
    } catch { /* leaderboard empty/unavailable */ }
  }

  async function postToLeaderboard() {
    setPostBusy(true)
    try {
      const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'TET Aspirant'
      await postScore(paperId, { name, score: result.correct, total: result.total })
      setPosted(true)
    } catch { /* */ } finally { setPostBusy(false) }
  }

  async function shareImage() {
    if (!cardRef.current) return
    try {
      // Lazy-load the heavy html2canvas only when the user shares.
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2, logging: false })
      canvas.toBlob(async (blob) => {
        if (!blob) return
        const file = new File([blob], 'tetgenie-score.png', { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], text: 'My TETGenie score 🧞' }) } catch { /* cancelled */ }
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = 'tetgenie-score.png'; a.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    } catch { /* capture failed */ }
  }

  if (loading) return <Splash label="Loading exam…" />
  if (!questions.length) return <div className="page"><p className="muted center mt-6">This paper has no questions.</p></div>

  // ── RESULT ──
  if (phase === 'result' && result) {
    const pct = Math.round((result.correct / result.total) * 100)
    const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'TET Aspirant'
    return (
      <div className="page">
        {/* Hidden capture card */}
        <div style={{ position: 'absolute', left: -9999, top: 0 }} aria-hidden>
          <ResultShareCard
            ref={cardRef}
            paperTitle={paper?.title || 'TET Mock Paper'}
            correct={result.correct}
            total={result.total}
            timeLabel={fmt(result.timeSec)}
            topPct={topPct}
            name={name}
          />
        </div>

        <div className="result-card mb-4">
          <span className="rc-brand">TETGenie 🧞</span>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{paper?.title}</div>
          <div className="score mt-2">{result.correct}<small>/{result.total}</small></div>
          <div className="pct">{pct}% {topPct != null && `· Top ${topPct}%`}</div>
          <div className="result-breakdown">
            <div className="rb"><div className="n">{result.correct}</div><div className="l">Correct</div></div>
            <div className="rb"><div className="n">{result.wrong}</div><div className="l">Wrong</div></div>
            <div className="rb"><div className="n">{result.skipped}</div><div className="l">Skipped</div></div>
          </div>
          <div style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--fs-sm)', opacity: 0.9 }}>⏱ {fmt(result.timeSec)} · No negative marking</div>
        </div>

        <div className="stack gap-3 mb-4">
          <button className="btn btn-gold btn-block" onClick={shareImage}><Icon name="share" size={18} /> Share result image</button>
          {posted ? (
            <button className="btn btn-ghost btn-block" disabled><Icon name="check" size={18} strokeWidth={3} /> Posted to leaderboard</button>
          ) : (
            <button className="btn btn-ghost btn-block" onClick={postToLeaderboard} disabled={postBusy}>
              {postBusy ? <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border-strong)' }} /> : <><Icon name="trophy" size={18} /> Post my score to leaderboard</>}
            </button>
          )}
          <div className="row gap-3">
            <button className="btn btn-primary grow" onClick={() => navigate(0)}>Retake</button>
            <button className="btn btn-ghost grow" onClick={() => navigate(backPath)}>Done</button>
          </div>
          <button className="btn btn-ghost btn-block" onClick={() => navigate(`/app/leaderboard?paper=${paperId}`)}>
            <Icon name="trophy" size={16} /> View leaderboard
          </button>
        </div>

        <div className="row" style={{ justifyContent: 'space-between', margin: 'var(--sp-4) 0 var(--sp-3)' }}>
          <span className="label" style={{ margin: 0 }}>Review answers</span>
          <LanguageToggle value={lang} onChange={setLang} />
        </div>
        <div className="stack gap-4">
          {questions.map((qq, i) => (
            <QuestionView key={qq.id || i} q={qq} lang={lang} showAnswer selected={answers[qq.id] ?? null} />
          ))}
        </div>
      </div>
    )
  }

  // ── EXAM / PRACTICE ──
  const pct = Math.round(((idx + 1) / questions.length) * 100)
  const isRevealed = mode === 'practice' && revealed[q.id]
  const chosen = answers[q.id]

  return (
    <div className="app-frame">
      <div className="exam-top">
        <button className="icon-btn" onClick={() => navigate(backPath)} aria-label="Exit exam"><Icon name="arrowLeft" size={20} /></button>
        <div className="exam-progress"><div style={{ width: `${pct}%` }} /></div>
        <span className="exam-timer">⏱ {fmt(elapsed)}</span>
      </div>

      <div className="exam-body">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
          <span className="muted" style={{ fontSize: 'var(--fs-sm)', fontWeight: 700 }}>Question {idx + 1} / {questions.length}</span>
          <div className="row gap-2">
            <LanguageToggle value={lang} onChange={setLang} />
            <button className="icon-btn" onClick={() => setShowPalette((s) => !s)} aria-label="Question palette"><Icon name="calendar" size={18} /></button>
          </div>
        </div>

        {showPalette && (
          <div className="card mb-4">
            <div className="palette">
              {questions.map((qq, i) => {
                let cls = ''
                if (answers[qq.id] != null) cls = 'answered'
                if (mode === 'practice' && revealed[qq.id]) cls = answers[qq.id] === qq.correctOption ? 'correct' : 'wrong'
                if (i === idx) cls += ' current'
                return <button key={qq.id || i} className={cls} onClick={() => { setIdx(i); setShowPalette(false) }}>{i + 1}</button>
              })}
            </div>
          </div>
        )}

        <div className="q-card">
          <div className="q-head">
            <span className="q-num">Q{q.questionNumber}</span>
            {q.subject && <span className="q-chip">{q.subject.replace('Language II (English)', 'English').replace('Language I (Telugu)', 'Telugu').replace('Child Development and Pedagogy', 'CDP').replace('Environmental Studies', 'EVS').replace('Mathematics', 'Maths')}</span>}
          </div>
          <div className="q-stem">
            {lang !== 'te' && q.englishQuestion && <span className="en">{q.englishQuestion}</span>}
            {lang !== 'en' && q.teluguQuestion && <span className="te telugu">{q.teluguQuestion}</span>}
          </div>
          {q.hasDiagram && <span className="q-diagram-note"><Icon name="book" size={13} /> Refers to a diagram in the original paper</span>}

          <div className="q-options">
            {q.options?.map((o) => {
              let cls = ''
              if (isRevealed) {
                if (o.index === q.correctOption) cls = 'correct'
                else if (o.index === chosen) cls = 'wrong'
              } else if (o.index === chosen) cls = 'selected'
              return (
                <button key={o.index} className={`q-option clickable ${cls}`} onClick={() => choose(o.index)}>
                  <span className="opt-key">{isRevealed && o.index === q.correctOption ? <Icon name="check" size={14} strokeWidth={3} /> : o.index}</span>
                  <span className="opt-text">
                    {lang !== 'te' && o.english && <span className="en">{o.english}</span>}
                    {lang !== 'en' && o.telugu && <span className="te telugu">{o.telugu}</span>}
                    {!o.english && !o.telugu && <span className="en muted">—</span>}
                  </span>
                </button>
              )
            })}
          </div>

          {isRevealed && (q.explanation || q.explanationTelugu) && (
            <div className="q-explain">
              <span className="lbl">{chosen === q.correctOption ? '✅ Correct!' : 'Answer'}</span>
              {q.explanation && <span>{q.explanation}</span>}
              {q.explanationTelugu && <span className="te telugu">{q.explanationTelugu}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="exam-nav">
        <button className="btn btn-ghost" style={{ flex: 'none', padding: '0 18px' }} disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}><Icon name="arrowLeft" size={18} /></button>
        {idx < questions.length - 1 ? (
          <button className="btn btn-primary grow" onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}>Next <Icon name="chevronRight" size={18} /></button>
        ) : (
          <button className="btn btn-gold grow" onClick={submit}>Submit exam <Icon name="check" size={18} strokeWidth={3} /></button>
        )}
      </div>
    </div>
  )
}
