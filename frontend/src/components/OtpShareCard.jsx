import { forwardRef } from 'react'

// Yellow OTP card built for html2canvas capture — inline styles with literal
// colors only (no CSS variables / color-mix), so the canvas renderer is happy.
const OtpShareCard = forwardRef(function OtpShareCard({ otp, title, date }, ref) {
  return (
    <div
      ref={ref}
      style={{
        width: 380,
        boxSizing: 'border-box',
        padding: '30px 26px',
        borderRadius: 24,
        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        color: '#3a2600',
        fontFamily: "'Inter', system-ui, sans-serif",
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
        <span style={{ fontWeight: 850, fontSize: 20 }}>TETGenie 🧞</span>
        <span style={{ fontSize: 12, opacity: 0.75 }}>Daily paper</span>
      </div>

      <div style={{ marginTop: 22, fontSize: 14, fontWeight: 700, opacity: 0.85 }}>
        Today's exam unlock code
      </div>
      <div style={{ fontSize: 52, fontWeight: 850, letterSpacing: '0.18em', marginTop: 6 }}>{otp}</div>

      {title && (
        <div style={{ marginTop: 16, fontSize: 14, fontWeight: 700, borderTop: '1px solid rgba(58,38,0,0.2)', paddingTop: 12 }}>
          {title}
        </div>
      )}
      {date && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{date}</div>}

      <div style={{ marginTop: 16, fontSize: 12, fontWeight: 600, opacity: 0.8 }}>
        Premium members: open the Daily tab → enter this code
      </div>
    </div>
  )
})

export default OtpShareCard
