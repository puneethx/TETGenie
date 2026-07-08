import { forwardRef } from 'react'

// A self-contained result card for html2canvas capture. Uses INLINE styles with
// literal colors (no CSS variables / color-mix) so the canvas renderer is happy.
const ResultShareCard = forwardRef(function ResultShareCard(
  { paperTitle, correct, total, timeLabel, topPct, name }, ref) {
  const pct = total ? Math.round((correct / total) * 100) : 0
  return (
    <div
      ref={ref}
      style={{
        width: 380,
        boxSizing: 'border-box',
        padding: '30px 26px 24px',
        borderRadius: 24,
        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
        color: '#ffffff',
        fontFamily: "'Inter', system-ui, sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>TETGenie 🧞</span>
        <span style={{ fontSize: 12, opacity: 0.85 }}>AP TET · SGT · Paper I</span>
      </div>

      <div style={{ marginTop: 22, fontSize: 13, opacity: 0.9 }}>{name ? `${name} scored` : 'My score'}</div>
      <div style={{ fontSize: 62, fontWeight: 850, lineHeight: 1 }}>
        {correct}<span style={{ fontSize: 26, opacity: 0.8 }}>/{total}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{pct}%</div>

      <div
        style={{
          marginTop: 12,
          fontSize: 14,
          fontWeight: 700,
          background: 'rgba(255,255,255,0.18)',
          borderRadius: 999,
          padding: '6px 14px',
          display: 'inline-block',
        }}
      >
        {topPct != null ? `🏆 Top ${topPct}% on TETGenie` : '🎯 Practice makes perfect'}
      </div>

      <div style={{ marginTop: 18, fontSize: 13, opacity: 0.92, borderTop: '1px solid rgba(255,255,255,0.25)', paddingTop: 12 }}>
        {paperTitle}
      </div>
      {timeLabel && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>⏱ {timeLabel}</div>}

      <div style={{ marginTop: 16, fontSize: 11, opacity: 0.7 }}>
        Practice daily mock papers · tetgenie
      </div>
    </div>
  )
})

export default ResultShareCard
