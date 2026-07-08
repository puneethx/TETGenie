import { useState } from 'react'
import Icon from './Icon'

// Text input specialised for passwords, with a show/hide toggle.
export default function PasswordInput({ error, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className="input-group">
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={`input ${error ? 'has-error' : ''}`}
        autoComplete={props.autoComplete || 'current-password'}
      />
      <button
        type="button"
        className="input-affix icon-btn"
        style={{ width: 34, height: 34 }}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        <Icon name={show ? 'eye-off' : 'eye'} size={19} />
      </button>
    </div>
  )
}
