import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { startExtraction, waitForExtraction, isBackendConfigured } from '../../lib/api'
import { publishPaper } from '../../lib/papers'
import Icon from '../../components/Icon'
import PageHeader from '../../components/PageHeader'
import QuestionView from '../../components/QuestionView'
import QuestionEditor from '../../components/QuestionEditor'
import LanguageToggle from '../../components/LanguageToggle'
import './upload.css'

const STEPS = [
  { key: 'rendering', label: 'Reading PDF' },
  { key: 'extracting', label: 'Extracting questions' },
  { key: 'enriching', label: 'Tagging & explaining' },
  { key: 'done', label: 'Done' },
]

function guessYear(name = '') {
  const m = name.match(/(20\d{2})/)
  return m ? m[1] : ''
}

// Returns a short reason string if the extracted question needs the admin's
// attention, or null if it looks complete. Used to flag & jump to problems.
function questionIssue(q) {
  if (!q.correctOption) return 'No answer detected'
  const filled = (q.options || []).filter((o) => (o.english || o.telugu || '').trim()).length
  if (filled < 2) return 'Missing options'
  if (!(q.englishQuestion || '').trim() && !(q.teluguQuestion || '').trim()) return 'Empty question'
  return null
}

export default function Upload() {
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [phase, setPhase] = useState('idle') // idle | processing | review | publishing | error
  const [file, setFile] = useState(null)
  const [year, setYear] = useState('')
  const [title, setTitle] = useState('')
  const [job, setJob] = useState(null)
  const [questions, setQuestions] = useState([])
  const [lang, setLang] = useState('both')
  const [error, setError] = useState('')
  const [onlyIssues, setOnlyIssues] = useState(false)
  const [adding, setAdding] = useState(null) // null | { suggestedNumber }

  function pickFile(f) {
    if (!f) return
    setFile(f)
    setYear((y) => y || guessYear(f.name))
    setTitle((t) => t || `Previous Year ${guessYear(f.name) || ''}`.trim())
  }

  async function onExtract() {
    setError('')
    if (!isBackendConfigured) {
      setError('The AI backend URL is not set yet (VITE_AI_BACKEND_URL). Deploy the backend first — see the README.')
      return
    }
    if (!file) return
    setPhase('processing')
    setJob({ status: 'queued', pagesDone: 0, totalPages: 0, questionsFound: 0 })
    try {
      const { jobId } = await startExtraction(file)
      const final = await waitForExtraction(jobId, setJob)
      if (final.status === 'error') {
        setError(final.error || 'Extraction failed.')
        setPhase('error')
        return
      }
      setQuestions(final.questions || [])
      setJob(final)
      setPhase('review')
    } catch (e) {
      setError(e.message || 'Something went wrong.')
      setPhase('error')
    }
  }

  function setCorrect(qIdx, optIndex) {
    setQuestions((qs) => qs.map((q, i) => (i === qIdx ? { ...q, correctOption: optIndex } : q)))
  }

  // Insert a manually-added question, keeping the list ordered by questionNumber
  // and replacing any existing entry with the same number.
  function addQuestion(newQ) {
    setQuestions((qs) => {
      const rest = qs.filter((q) => q.questionNumber !== newQ.questionNumber)
      return [...rest, newQ].sort((a, b) => a.questionNumber - b.questionNumber)
    })
    setAdding(null)
  }

  async function onPublish() {
    setPhase('publishing')
    try {
      const id = await publishPaper({
        title, year, sourceFile: file?.name, questions,
        stats: job?.stats,
      })
      navigate(`/app/papers/${id}`)
    } catch (e) {
      setError(e.message || 'Failed to save the paper.')
      setPhase('review')
    }
  }

  // ── PROCESSING ──
  if (phase === 'processing') {
    const isEnriching = job?.status === 'enriching'
    const statusIdx = STEPS.findIndex((s) => s.key === job?.status)

    // During enrichment the page pass is done; track the (slow) explanation
    // batches instead, so the bar keeps moving and the admin isn't left guessing.
    const total = isEnriching ? (job?.enrichTotal || 0) : (job?.totalPages || 0)
    const done = isEnriching ? (job?.enrichDone || 0) : (job?.pagesDone || 0)
    const pct = total ? Math.round((done / total) * 100) : 5

    return (
      <div className="page">
        <div className="extracting">
          <div className="extract-orb"><Icon name="sparkles" size={40} /></div>
          <h2 className="h3">{isEnriching ? 'Writing explanations…' : 'Extracting your paper…'}</h2>
          <p className="muted">
            {isEnriching
              ? 'Claude is tagging each question and writing bilingual explanations. This is the slowest step — keep this tab open.'
              : 'Claude is reading each page in Telugu & English. Keep this tab open.'}
          </p>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
            {isEnriching
              ? (total ? `Explained ${done} of ${total} questions` : 'Preparing explanations…')
              : (total ? `Page ${done} of ${total}` : 'Starting…') + ` · ${job?.questionsFound || 0} questions found`}
          </div>
          <div className="progress-steps">
            {STEPS.map((s, i) => (
              <span key={s.key} className={`pstep ${i === statusIdx ? 'on' : ''} ${statusIdx > i ? 'done' : ''}`}>
                {statusIdx > i ? <Icon name="check" size={12} strokeWidth={3} /> : <span>•</span>} {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── REVIEW ──
  if (phase === 'review' || phase === 'publishing') {
    const stats = job?.stats || {}
    // Indices of questions that need attention, so the admin can jump straight
    // to each one instead of hunting through all ~150.
    const issues = questions
      .map((q, i) => ({ i, q, reason: questionIssue(q) }))
      .filter((x) => x.reason)

    function jumpTo(i) {
      setOnlyIssues(false)
      // Let the (possibly filtered) list re-render before scrolling.
      requestAnimationFrame(() => {
        document.getElementById(`rev-q-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }

    const shown = onlyIssues ? issues.map((x) => x.i) : questions.map((_, i) => i)

    // What the paper *should* contain vs what we have, so the admin can add the
    // leftover questions by hand. `expectedTotal` comes from the PDF's text layer
    // (e.g. 150); we recompute the gap against the current list each render so it
    // shrinks as the admin adds questions.
    const presentNumbers = new Set(questions.map((q) => q.questionNumber))
    const expectedTotal = job?.expectedTotal || 0
    let missing = []
    if (expectedTotal) {
      missing = Array.from({ length: expectedTotal }, (_, k) => k + 1).filter((n) => !presentNumbers.has(n))
    } else if (job?.missingQuestions?.length) {
      missing = job.missingQuestions.filter((n) => !presentNumbers.has(n))
    }
    const nextNumber = questions.length
      ? Math.max(...questions.map((q) => q.questionNumber)) + 1
      : 1

    return (
      <div className="page">
        <PageHeader
          title="Review & publish"
          subtitle={expectedTotal
            ? `${questions.length} of ${expectedTotal} questions`
            : `${questions.length} questions extracted`}
        />

        <div className="review-stats mb-4">
          <div className="stat-tile"><div className="n">{stats.total ?? questions.length}</div><div className="l">Questions</div></div>
          <div className="stat-tile"><div className="n">{stats.withAnswer ?? '—'}</div><div className="l">With answer</div></div>
          <div className="stat-tile"><div className="n" style={{ color: 'var(--green-500)' }}>{stats.byDifficulty?.easy ?? 0}</div><div className="l">Easy</div></div>
          <div className="stat-tile"><div className="n" style={{ color: issues.length ? 'var(--gold-600)' : 'var(--green-500)' }}>{issues.length}</div><div className="l">To review</div></div>
        </div>

        {missing.length > 0 && (
          <div className="auth-alert" style={{ color: 'var(--red-500)', background: 'color-mix(in srgb, var(--red-500) 10%, var(--surface))', borderColor: 'color-mix(in srgb, var(--red-500) 40%, transparent)' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              {missing.length} question(s) couldn’t be read from the PDF{expectedTotal ? ` (${questions.length} of ${expectedTotal})` : ''}. Add each one by hand:
            </div>
            <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
              {missing.map((n) => (
                <button
                  key={n}
                  className="q-chip"
                  style={{ cursor: 'pointer', borderColor: 'var(--red-500)', color: 'var(--red-500)' }}
                  onClick={() => setAdding({ suggestedNumber: n })}
                >
                  + Add Q{n}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          className="btn btn-ghost btn-block mb-4"
          onClick={() => setAdding({ suggestedNumber: missing[0] || nextNumber })}
        >
          <Icon name="plus" size={18} /> Add a question manually
        </button>

        {issues.length > 0 && (
          <div className="auth-alert" style={{ color: 'var(--gold-600)', background: 'color-mix(in srgb, var(--gold-500) 12%, var(--surface))', borderColor: 'color-mix(in srgb, var(--gold-500) 40%, transparent)' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              {issues.length} question(s) need your attention — tap one to jump to it:
            </div>
            <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
              {issues.map((x) => (
                <button
                  key={x.i}
                  className="q-chip"
                  style={{ cursor: 'pointer', borderColor: 'var(--gold-500)', color: 'var(--gold-600)' }}
                  onClick={() => jumpTo(x.i)}
                  title={x.reason}
                >
                  Q{x.q.questionNumber}
                </button>
              ))}
            </div>
            <label className="row gap-2 mt-3" style={{ cursor: 'pointer', fontSize: 'var(--fs-sm)' }}>
              <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} />
              Show only questions needing review
            </label>
          </div>
        )}

        <div className="field">
          <label className="label">Paper title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Previous Year 2025 — Shift 2" />
        </div>
        <div className="field">
          <label className="label">Year</label>
          <input className="input" value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" placeholder="2025" />
        </div>

        <div className="row" style={{ justifyContent: 'space-between', margin: 'var(--sp-4) 0 var(--sp-3)' }}>
          <span className="label" style={{ margin: 0 }}>Questions</span>
          <LanguageToggle value={lang} onChange={setLang} />
        </div>

        <div className="stack gap-4">
          {shown.map((i) => {
            const q = questions[i]
            const reason = questionIssue(q)
            return (
              <div key={q.id || i} id={`rev-q-${i}`} style={reason ? { scrollMarginTop: 72, borderRadius: 'var(--r-lg)', boxShadow: '0 0 0 2px var(--gold-500)' } : { scrollMarginTop: 72 }}>
                {reason && (
                  <div className="row gap-2" style={{ color: 'var(--gold-600)', fontSize: 'var(--fs-sm)', fontWeight: 700, padding: '6px 10px' }}>
                    <Icon name="sparkles" size={14} /> {reason} — please fix below
                  </div>
                )}
                <QuestionView
                  q={q}
                  lang={lang}
                  showAnswer
                  editable
                  onSetCorrect={(optIndex) => setCorrect(i, optIndex)}
                />
              </div>
            )
          })}
        </div>

        <div className="publish-bar">
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={onPublish}
            disabled={phase === 'publishing'}
          >
            {phase === 'publishing' ? <span className="spinner" /> : <>Publish paper <Icon name="check" size={18} strokeWidth={3} /></>}
          </button>
        </div>

        {adding && (
          <QuestionEditor
            suggestedNumber={adding.suggestedNumber}
            existingNumbers={presentNumbers}
            onSave={addQuestion}
            onCancel={() => setAdding(null)}
          />
        )}
      </div>
    )
  }

  // ── IDLE / ERROR ──
  return (
    <div className="page">
      <PageHeader title="Upload question paper" subtitle="One PDF at a time · previous-year paper" />

      {error && <div className="auth-alert" role="alert">{error}</div>}

      <div
        className={`dropzone ${file ? 'has-file' : ''}`}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <div className="dz-icon"><Icon name={file ? 'check' : 'upload'} size={28} strokeWidth={file ? 3 : 2} /></div>
        {file ? (
          <>
            <div style={{ fontWeight: 700 }}>{file.name}</div>
            <div className="muted" style={{ fontSize: 'var(--fs-sm)' }}>{(file.size / 1024 / 1024).toFixed(1)} MB · tap to change</div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 700 }}>Tap to choose a PDF</div>
            <div className="muted" style={{ fontSize: 'var(--fs-sm)' }}>The answer-marked previous-year paper</div>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </div>

      <div className="card mt-4" style={{ fontSize: 'var(--fs-sm)' }}>
        <div className="row gap-2" style={{ color: 'var(--primary)', fontWeight: 700, marginBottom: 6 }}>
          <Icon name="sparkles" size={16} /> How it works
        </div>
        <p className="muted">
          Each page is rendered and read by Claude 4.6 Opus vision — extracting the Telugu &amp;
          English question, all options, and the green correct-answer marker — then tagged with
          subject, topic and difficulty, with a short explanation. You review before publishing.
        </p>
      </div>

      <button className="btn btn-primary btn-lg btn-block mt-5" onClick={onExtract} disabled={!file}>
        Extract questions <Icon name="sparkles" size={18} />
      </button>
    </div>
  )
}
