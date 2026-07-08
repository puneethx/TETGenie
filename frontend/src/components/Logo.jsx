// TETGenie wordmark + mark. `size` scales the whole lockup.
export default function Logo({ size = 28, withText = true }) {
  return (
    <span className="brand-lockup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span
        className="brand-mark"
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          background: 'var(--grad-brand)',
          display: 'inline-grid',
          placeItems: 'center',
          boxShadow: 'var(--shadow-sm)',
          flex: 'none',
        }}
      >
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
          <path d="M6 6h12" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M12 6v12" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="17" cy="16" r="3" fill="#fbbf24" />
        </svg>
      </span>
      {withText && (
        <span style={{ fontWeight: 800, fontSize: size * 0.66, letterSpacing: '-0.02em' }}>
          TET<span style={{ color: 'var(--primary)' }}>Genie</span>
        </span>
      )}
    </span>
  )
}
