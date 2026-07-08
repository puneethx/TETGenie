// Stores a user's exam attempts under users/{uid}/attempts/{paperId}.
// We keep the best score (and last score) per paper so we can prompt the user
// to beat their best.
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from './firebase'

export async function getAttempt(paperId) {
  const uid = auth?.currentUser?.uid
  if (!uid) return null
  const snap = await getDoc(doc(db, 'users', uid, 'attempts', paperId))
  return snap.exists() ? snap.data() : null
}

// Record a finished attempt; updates bestScore if this run beat it.
export async function saveAttempt({ paperId, paperTitle, score, total }) {
  const uid = auth?.currentUser?.uid
  if (!uid) return
  const ref = doc(db, 'users', uid, 'attempts', paperId)
  const prev = await getDoc(ref)
  const prevData = prev.exists() ? prev.data() : {}
  const bestScore = Math.max(score, prevData.bestScore ?? 0)
  await setDoc(
    ref,
    {
      paperId,
      paperTitle: paperTitle || '',
      total,
      lastScore: score,
      bestScore,
      attempts: (prevData.attempts ?? 0) + 1,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
  return { bestScore, improved: score >= (prevData.bestScore ?? 0) }
}
