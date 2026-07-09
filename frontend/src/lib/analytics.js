// Cumulative per-subject performance, stored at users/{uid}/stats/subjects.
// Powers the home analytics card ("you're weakest in X → practice it").
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from './firebase'

// From one finished attempt, compute correct/total per subject (attempted only).
export function subjectDeltas(questions, answers) {
  const d = {}
  for (const q of questions) {
    const a = answers[q.id]
    if (a == null) continue
    const s = q.subject || 'Other'
    d[s] = d[s] || { correct: 0, total: 0 }
    d[s].total += 1
    if (a === q.correctOption) d[s].correct += 1
  }
  return d
}

export async function addSubjectStats(deltas) {
  const uid = auth?.currentUser?.uid
  if (!uid || !deltas || !Object.keys(deltas).length) return
  const ref = doc(db, 'users', uid, 'stats', 'subjects')
  const snap = await getDoc(ref)
  const cur = snap.exists() ? (snap.data().subjects || {}) : {}
  for (const [s, d] of Object.entries(deltas)) {
    cur[s] = cur[s] || { correct: 0, total: 0 }
    cur[s].correct += d.correct
    cur[s].total += d.total
  }
  await setDoc(ref, { subjects: cur, updatedAt: serverTimestamp() }, { merge: true })
}

export async function getSubjectStats() {
  const uid = auth?.currentUser?.uid
  if (!uid) return {}
  const snap = await getDoc(doc(db, 'users', uid, 'stats', 'subjects'))
  return snap.exists() ? (snap.data().subjects || {}) : {}
}
