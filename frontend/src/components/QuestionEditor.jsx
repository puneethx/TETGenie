import { useState } from 'react'
import Icon from './Icon'

// Canonical subject names — must match the backend enricher (prompts.SUBJECTS)
// and QuestionView.shortSubject so manually-added questions behave like
// extracted ones everywhere (filters, stats, the daily-generator bank).
export const SUBJECTS = [
  'Child Development and Pedagogy',
  'Language I (Telugu)',
  'Language II (English)',
  'Mathematics',
  'Environmental Studies',
]
const DIFFICULTIES = ['easy', 'medium', 'hard']

// Same 30-questions-per-subject rule the backend uses as its fallback, so a
// manually-added question gets a sensible default subject from its number.
export function subjectForQnum(n) {
  const idx = Math.min(Math.max(Math.floor((Number(n) - 1) / 30), 0), 4)
  return SUBJECTS[idx] || SUBJECTS[0]
}

function blankQuestion(number) {
  const n = Number(number) || ''
  return {
    id: `manual-${number || 'q'}-${Date.now().toString(36)}`,
    questionNumber: n,
    subject: n ? subjectForQnum(n) : SUBJECTS[0],
    topic: '',
    difficulty: 'medium',
    englishQuestion: '',
    teluguQuestion: '',
    options: [1, 2, 3, 4].map((index) => ({ index, english: '', telugu: '' })),
    correctOption: null,
    explanation: '',
    explanationTelugu: '',
    hasDiagram: false,
    manuallyAdded: true,
  }
}

// A full manual question form shown in a modal. Collects every field stored in
// the database so an admin can add questions the extractor missed.
//   suggestedNumber — pre-fill the question number (a missing one)
//   existingNumbers — Set of numbers already present, to warn about duplicates
//   onSave(question) / onCancel()
export default function QuestionEditor({ suggestedNumber, existingNumbers, onSave, onCancel }) {
  const [q, setQ] = useState(() => blankQuestion(suggestedNumber))
  const [errors, setErrors] = useState({})

  const set = (patch) => setQ((prev) => ({ ...prev, ...patch }))
  function setOption(index, patch) {
    setQ((prev) => ({
      ...prev,
      options: prev.options.map((o) => (o.index === index ? { ...o, ...patch } : o)),
    }))
  }

  function validate() {
    const e = {}
    const num = Number(q.questionNumber)
    if (!num || num < 1 || !Number.isInteger(num)) e.questionNumber = 'Enter a valid question number.'
    else if (existingNumbers?.has(num)) e.questionNumber = `Q${num} already exists in this paper.`
    if (!(q.englishQuestion || '').trim() && !(q.teluguQuestion || '').trim())
      e.stem = 'Enter the question in English and/or Telugu.'
    const filled = q.options.filter((o) => (o.english || o.telugu || '').trim())
    if (filled.length < 2) e.options = 'Fill at least two options.'
    if (!q.correctOption) e.correctOption = 'Mark which option is correct.'
    else if (!(q.options.find((o) => o.index === q.correctOption)?.english
             || q.options.find((o) => o.index === q.correctOption)?.telugu))
      e.correctOption = 'The correct option is empty — add its text.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function save() {
    if (!validate()) return
    onSave({
      ...q,
      questionNumber: Number(q.questionNumber),
      // Drop entirely-empty options so they don't render as blank rows.
      options: q.options.filter((o) => (o.english || o.telugu || '').trim() || o.index === q.correctOption),
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', background: 'rgba(0,0,0,0.55)', padding: 'var(--sp-3)',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card card-pad-lg"
        style={{ width: '100%', maxWidth: 'var(--app-max-width)', margin: 'auto' }}
      >
        <div className="row gap-2" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
          <span style={{ fontWeight: 850, fontSize: 'var(--fs-lg)' }}>➕ Add a question</span>
          <button className="icon-btn" onClick={onCancel} aria-label="Close">
            <Icon name="plus" size={22} style={{ transform: 'rotate(45deg)' }} />
          </button>
        </div>

        {/* Number + subject */}
        <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
          <div className="field" style={{ flex: '0 0 34%', marginBottom: 'var(--sp-3)' }}>
            <label className="label">Question no. <span className="req">*</span></label>
            <input
              className={`input ${errors.questionNumber ? 'has-error' : ''}`}
              inputMode="numeric"
              value={q.questionNumber}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '')
                set({ questionNumber: v, subject: v ? subjectForQnum(v) : q.subject })
              }}
              placeholder="e.g. 3"
            />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 'var(--sp-3)' }}>
            <label className="label">Subject <span className="req">*</span></label>
            <select className="input" value={q.subject} onChange={(e) => set({ subject: e.target.value })}>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {errors.questionNumber && <p className="help-text" style={{ color: 'var(--red-500)', marginTop: -8, marginBottom: 8 }}>{errors.questionNumber}</p>}

        {/* Topic + difficulty */}
        <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
          <div className="field" style={{ flex: 1, marginBottom: 'var(--sp-3)' }}>
            <label className="label">Topic</label>
            <input className="input" value={q.topic} onChange={(e) => set({ topic: e.target.value })} placeholder="optional, e.g. Motivation" />
          </div>
          <div className="field" style={{ flex: '0 0 40%', marginBottom: 'var(--sp-3)' }}>
            <label className="label">Difficulty</label>
            <select className="input" value={q.difficulty} onChange={(e) => set({ difficulty: e.target.value })}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Question stem */}
        <div className="field" style={{ marginBottom: 'var(--sp-3)' }}>
          <label className="label">Question — English</label>
          <textarea className={`input ${errors.stem ? 'has-error' : ''}`} rows={2} value={q.englishQuestion} onChange={(e) => set({ englishQuestion: e.target.value })} placeholder="Type the question in English" />
        </div>
        <div className="field" style={{ marginBottom: 'var(--sp-3)' }}>
          <label className="label">Question — తెలుగు</label>
          <textarea className={`input telugu ${errors.stem ? 'has-error' : ''}`} rows={2} value={q.teluguQuestion} onChange={(e) => set({ teluguQuestion: e.target.value })} placeholder="ప్రశ్నను తెలుగులో టైప్ చేయండి" />
        </div>
        {errors.stem && <p className="help-text" style={{ color: 'var(--red-500)', marginTop: -8, marginBottom: 8 }}>{errors.stem}</p>}

        {/* Options */}
        <label className="label" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
          Options <span className="req">*</span> — tap the circle to mark the correct one
        </label>
        <div className="stack gap-3" style={{ marginBottom: 'var(--sp-2)' }}>
          {q.options.map((o) => {
            const isCorrect = q.correctOption === o.index
            return (
              <div key={o.index} className="card" style={{ padding: 'var(--sp-3)', borderColor: isCorrect ? 'var(--green-500)' : 'var(--border)' }}>
                <div className="row gap-2" style={{ marginBottom: 'var(--sp-2)' }}>
                  <button
                    type="button"
                    onClick={() => set({ correctOption: o.index })}
                    aria-label={`Mark option ${o.index} correct`}
                    style={{
                      width: 26, height: 26, flex: 'none', borderRadius: '999px',
                      display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13,
                      border: `2px solid ${isCorrect ? 'var(--green-500)' : 'var(--border-strong)'}`,
                      background: isCorrect ? 'var(--green-500)' : 'transparent',
                      color: isCorrect ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    {isCorrect ? <Icon name="check" size={14} strokeWidth={3} /> : o.index}
                  </button>
                  <span className="label" style={{ margin: 0 }}>Option {o.index}{isCorrect ? ' · correct' : ''}</span>
                </div>
                <input className="input" style={{ marginBottom: 6 }} value={o.english} onChange={(e) => setOption(o.index, { english: e.target.value })} placeholder="English text" />
                <input className="input telugu" value={o.telugu} onChange={(e) => setOption(o.index, { telugu: e.target.value })} placeholder="తెలుగు" />
              </div>
            )
          })}
        </div>
        {(errors.options || errors.correctOption) && (
          <p className="help-text" style={{ color: 'var(--red-500)', marginBottom: 'var(--sp-2)' }}>
            {errors.options || errors.correctOption}
          </p>
        )}

        {/* Explanation */}
        <div className="field" style={{ marginBottom: 'var(--sp-3)' }}>
          <label className="label">Explanation — English</label>
          <textarea className="input" rows={2} value={q.explanation} onChange={(e) => set({ explanation: e.target.value })} placeholder="optional — a short 1–2 line reason" />
        </div>
        <div className="field" style={{ marginBottom: 'var(--sp-3)' }}>
          <label className="label">Explanation — తెలుగు</label>
          <textarea className="input telugu" rows={2} value={q.explanationTelugu} onChange={(e) => set({ explanationTelugu: e.target.value })} placeholder="optional" />
        </div>

        <label className="row gap-2" style={{ cursor: 'pointer', fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-4)' }}>
          <input type="checkbox" checked={q.hasDiagram} onChange={(e) => set({ hasDiagram: e.target.checked })} />
          This question refers to a diagram/figure in the original paper
        </label>

        <div className="row gap-2">
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={save}>
            <Icon name="check" size={18} strokeWidth={3} /> Save question
          </button>
        </div>
      </div>
    </div>
  )
}
