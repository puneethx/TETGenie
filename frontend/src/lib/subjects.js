// The 5 AP TET · SGT · Paper I subjects, in paper order. `name` matches the
// value stored on each question (set during extraction/enrichment); `id` is the
// URL slug used for subject-wise practice.
export const SUBJECTS = [
  { id: 'cdp', name: 'Child Development and Pedagogy', short: 'CDP', te: 'బాల వికాసం & బోధన', icon: 'user' },
  { id: 'telugu', name: 'Language I (Telugu)', short: 'Telugu', te: 'తెలుగు', icon: 'book' },
  { id: 'english', name: 'Language II (English)', short: 'English', te: 'ఇంగ్లీష్', icon: 'book' },
  { id: 'maths', name: 'Mathematics', short: 'Maths', te: 'గణితం', icon: 'sparkles' },
  { id: 'evs', name: 'Environmental Studies', short: 'EVS', te: 'పరిసరాల విజ్ఞానం', icon: 'calendar' },
]

export function subjectById(id) {
  return SUBJECTS.find((s) => s.id === id) || null
}

// The 150-question paper is 5 subjects × 30, in SUBJECTS order.
export function subjectNameForQnum(qnum) {
  const idx = Math.min(SUBJECTS.length - 1, Math.max(0, Math.floor((Number(qnum) - 1) / 30)))
  return SUBJECTS[idx].name
}

// Match a stored question subject string to one of our canonical subjects.
export function subjectIdForName(name = '') {
  const n = name.toLowerCase()
  if (n.includes('child') || n.includes('pedagog')) return 'cdp'
  if (n.includes('telugu')) return 'telugu'
  if (n.includes('english')) return 'english'
  if (n.includes('math')) return 'maths'
  if (n.includes('environ') || n.includes('evs')) return 'evs'
  return null
}
