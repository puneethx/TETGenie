// Standard in-page header used across authenticated screens.
export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
      <div>
        <h1 className="h2">{title}</h1>
        {subtitle && <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
