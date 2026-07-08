import Icon from './Icon'

// Honest "next build" placeholder for routes whose full feature ships in a
// later phase — keeps navigation complete without pretending to be done.
export default function Placeholder({ icon = 'sparkles', title, phase, children }) {
  return (
    <div className="page">
      <div
        className="card card-pad-lg center stack gap-3"
        style={{ marginTop: 'var(--sp-6)', alignItems: 'center' }}
      >
        <span
          style={{
            width: 64, height: 64, borderRadius: 'var(--r-lg)',
            display: 'grid', placeItems: 'center',
            background: 'var(--primary-soft)', color: 'var(--primary)',
          }}
        >
          <Icon name={icon} size={30} />
        </span>
        <h2 className="h3">{title}</h2>
        {children && <p className="muted" style={{ maxWidth: '32ch' }}>{children}</p>}
        {phase && (
          <span className="badge badge-admin" style={{ marginTop: 4 }}>
            Ships in {phase}
          </span>
        )}
      </div>
    </div>
  )
}
