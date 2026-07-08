import Icon from './Icon'
import './questions.css'

// Read-only (or lightly editable) question display.
// Props:
//   q         — question object
//   index     — display number (falls back to q.questionNumber)
//   lang      — 'both' | 'en' | 'te'
//   showAnswer— highlight the correct option + show explanation
//   selected  — the option index the user chose (for exam review); optional
//   editable  — if true, options are clickable to SET the correct answer
//   onSetCorrect(index) — called when editing the correct answer
export default function QuestionView({
  q, index, lang = 'both', showAnswer = true, selected = null,
  editable = false, onSetCorrect,
}) {
  const showEn = lang !== 'te'
  const showTe = lang !== 'en'
  const num = index ?? q.questionNumber

  function optionClass(optIndex) {
    const isCorrect = q.correctOption === optIndex
    const isSelected = selected === optIndex
    if (showAnswer && isCorrect) return 'correct'
    if (showAnswer && isSelected && !isCorrect) return 'wrong'
    if (isSelected) return 'selected'
    return ''
  }

  return (
    <div className="q-card">
      <div className="q-head">
        <span className="q-num">Q{num}</span>
        {q.subject && <span className="q-chip">{shortSubject(q.subject)}</span>}
        {q.topic && <span className="q-chip">{q.topic}</span>}
        {q.difficulty && <span className={`q-chip diff-${q.difficulty}`}>{q.difficulty}</span>}
        {showAnswer && !q.correctOption && (
          <span className="q-warn"><Icon name="lock" size={12} /> no answer detected</span>
        )}
      </div>

      <div className="q-stem">
        {showEn && q.englishQuestion && <span className="en">{q.englishQuestion}</span>}
        {showTe && q.teluguQuestion && <span className="te telugu">{q.teluguQuestion}</span>}
      </div>
      {q.hasDiagram && (
        <span className="q-diagram-note">
          <Icon name="book" size={13} /> This question refers to a diagram in the original paper
        </span>
      )}

      <div className="q-options">
        {q.options?.map((o) => {
          const cls = optionClass(o.index)
          const clickable = editable
          return (
            <button
              key={o.index}
              type="button"
              className={`q-option ${cls} ${clickable ? 'clickable' : ''}`}
              onClick={clickable ? () => onSetCorrect?.(o.index) : undefined}
              disabled={!clickable}
              style={!clickable ? { cursor: 'default' } : undefined}
            >
              <span className="opt-key">
                {showAnswer && q.correctOption === o.index ? <Icon name="check" size={14} strokeWidth={3} /> : o.index}
              </span>
              <span className="opt-text">
                {showEn && o.english && <span className="en">{o.english}</span>}
                {showTe && o.telugu && <span className="te telugu">{o.telugu}</span>}
                {!o.english && !o.telugu && <span className="en muted">—</span>}
              </span>
            </button>
          )
        })}
      </div>

      {editable && (
        <p className="help-text mt-2">Tap an option to mark it as the correct answer.</p>
      )}

      {showAnswer && (q.explanation || q.explanationTelugu) && (
        <div className="q-explain">
          <span className="lbl">Why</span>
          {q.explanation && <span>{q.explanation}</span>}
          {q.explanationTelugu && <span className="te telugu">{q.explanationTelugu}</span>}
        </div>
      )}
    </div>
  )
}

function shortSubject(s) {
  const map = {
    'Child Development and Pedagogy': 'CDP',
    'Language I (Telugu)': 'Telugu',
    'Language II (English)': 'English',
    'Mathematics': 'Maths',
    'Environmental Studies': 'EVS',
  }
  return map[s] || s
}
