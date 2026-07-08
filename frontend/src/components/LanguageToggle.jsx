// Telugu / English / Both switch for viewing bilingual questions.
export default function LanguageToggle({ value, onChange }) {
  const opts = [
    { k: 'both', label: 'Both' },
    { k: 'te', label: 'తెలుగు' },
    { k: 'en', label: 'English' },
  ]
  return (
    <div className="lang-toggle" role="group" aria-label="Question language">
      {opts.map((o) => (
        <button
          key={o.k}
          className={value === o.k ? 'on' : ''}
          onClick={() => onChange(o.k)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
