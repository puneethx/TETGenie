// Robust image sharing for mobile browsers (the primary way results/OTPs spread
// on WhatsApp). Two-step so native sharing survives the browser's
// "user activation" rule on iOS/Android:
//   1) renderNodeToFile(node)  — do the slow html2canvas work up front (on mount)
//   2) shareFile(file, text)   — call straight from the tap handler → share sheet
//
// If the browser can't share files (older desktops), we download the PNG instead
// so the button never silently does nothing.

export async function renderNodeToFile(node, fileName = 'tetgenie.png') {
  if (!node) return null
  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(node, { backgroundColor: null, scale: 2, logging: false, useCORS: true })
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return null
  return new File([blob], fileName, { type: 'image/png' })
}

// Returns one of: 'shared' | 'cancelled' | 'downloaded' | 'failed'
export async function shareFile(file, text = '') {
  if (!file) return 'failed'
  // Preferred path: the OS share sheet (WhatsApp, etc.).
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], text })
      return 'shared'
    }
  } catch (e) {
    // The user dismissing the sheet throws AbortError — that's not an error.
    if (e && e.name === 'AbortError') return 'cancelled'
    // Anything else → fall through to download.
  }
  // Fallback: download the image so the user can attach it manually.
  try {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name || 'tetgenie.png'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}

// Convenience: render + share in one call (used where pre-rendering isn't set up).
export async function shareNode(node, { fileName = 'tetgenie.png', text = '' } = {}) {
  const file = await renderNodeToFile(node, fileName)
  return shareFile(file, text)
}
