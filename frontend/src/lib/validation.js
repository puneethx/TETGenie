// Shared form validation. Password policy per spec:
// minimum 8 characters, at least one uppercase letter, confirmed twice.

export function validateEmail(email) {
  const v = (email || '').trim()
  if (!v) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address'
  return null
}

export function validatePassword(pw) {
  if (!pw) return 'Password is required'
  if (pw.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter'
  return null
}

export function validateConfirm(pw, confirm) {
  if (!confirm) return 'Please re-enter your password'
  if (pw !== confirm) return 'Passwords do not match'
  return null
}

export function validateFirstName(name) {
  if (!name || !name.trim()) return 'First name is required'
  if (name.trim().length < 2) return 'Please enter your first name'
  return null
}

// Live strength meter for the signup UI. Returns { score 0-4, label, checks }.
export function passwordStrength(pw = '') {
  const checks = {
    length: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  }
  const score = Object.values(checks).filter(Boolean).length
  const label = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score]
  return { score, label, checks }
}
