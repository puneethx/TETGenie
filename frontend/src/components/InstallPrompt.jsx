import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

const DISMISS_KEY = 'tetgenie-a2hs-dismissed'

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}
function detectPlatform() {
  const ua = navigator.userAgent || ''
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'other'
}

// A friendly "Add to Home Screen" guide. Opens once automatically after login
// (unless already installed / dismissed) and can be reopened from Account via
// the `tetgenie:install` window event.
export default function InstallPrompt() {
  const [open, setOpen] = useState(false)
  const platform = detectPlatform()
  const deferredRef = useRef(null)      // Android beforeinstallprompt event
  const [canNativeInstall, setCanNativeInstall] = useState(false)

  useEffect(() => {
    if (isStandalone()) return // already installed → never show

    function onBeforeInstall(e) {
      e.preventDefault()
      deferredRef.current = e
      setCanNativeInstall(true)
    }
    function onManualOpen() { setOpen(true) }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('tetgenie:install', onManualOpen)

    // Auto-open once per device, shortly after landing in the app.
    let t
    if (!localStorage.getItem(DISMISS_KEY)) {
      t = setTimeout(() => setOpen(true), 1500)
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('tetgenie:install', onManualOpen)
      if (t) clearTimeout(t)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setOpen(false)
  }

  async function nativeInstall() {
    const e = deferredRef.current
    if (!e) return
    e.prompt()
    try { await e.userChoice } catch { /* ignore */ }
    deferredRef.current = null
    setCanNativeInstall(false)
    dismiss()
  }

  if (!open) return null

  const steps = platform === 'ios'
    ? [
        <>Tap the <strong>Share</strong> button <span aria-hidden>⬆️</span> in Safari's bottom bar.</>,
        <>Scroll down and tap <strong>“Add to Home Screen”</strong>.</>,
        <>Tap <strong>Add</strong> — TETGenie now opens like an app. 🎉</>,
      ]
    : platform === 'android'
    ? [
        <>Tap the <strong>⋮ menu</strong> (top-right) in Chrome.</>,
        <>Tap <strong>“Add to Home screen”</strong> (or “Install app”).</>,
        <>Confirm <strong>Add</strong> — TETGenie now opens like an app. 🎉</>,
      ]
    : [
        <>Open your browser menu.</>,
        <>Choose <strong>“Install”</strong> or <strong>“Add to Home Screen”</strong>.</>,
        <>Confirm — TETGenie opens like an app. 🎉</>,
      ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end',
        justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 'var(--sp-3)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card card-pad-lg"
        style={{ width: '100%', maxWidth: 'var(--app-max-width)', marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="row gap-2" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
          <span style={{ fontWeight: 850, fontSize: 'var(--fs-lg)' }}>📲 Add TETGenie to your home screen</span>
          <button className="icon-btn" onClick={dismiss} aria-label="Close"><Icon name="plus" size={22} style={{ transform: 'rotate(45deg)' }} /></button>
        </div>
        <p className="muted" style={{ fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-3)' }}>
          Open TETGenie in one tap, like a real app — no browser bar. మీ ఫోన్‌లో యాప్‌లా తెరవండి.
        </p>

        {canNativeInstall ? (
          <button className="btn btn-primary btn-lg btn-block" onClick={nativeInstall}>
            <Icon name="plus" size={18} /> Install TETGenie
          </button>
        ) : (
          <ol style={{ paddingLeft: '1.2em', display: 'grid', gap: 'var(--sp-2)', fontSize: 'var(--fs-sm)', lineHeight: 1.5 }}>
            {steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        )}

        <button className="btn btn-ghost btn-block mt-4" onClick={dismiss}>Maybe later</button>
      </div>
    </div>
  )
}
