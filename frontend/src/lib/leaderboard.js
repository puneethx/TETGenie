// Opt-in leaderboard: one score doc per user per paper. Works for both
// previous-year and daily papers (keyed by paperId).
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from './firebase'

// User consents to publish their score for this paper.
export async function postScore(paperId, { name, score, total }) {
  const uid = auth?.currentUser?.uid
  if (!uid) return
  await setDoc(doc(db, 'leaderboard', paperId, 'scores', uid), {
    uid,
    name: name || 'Anonymous',
    score,
    total,
    pct: total ? Math.round((score / total) * 100) : 0,
    updatedAt: serverTimestamp(),
  })
}

export async function getLeaderboard(paperId) {
  const snap = await getDocs(collection(db, 'leaderboard', paperId, 'scores'))
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.score - a.score || (a.updatedAt?.seconds || 0) - (b.updatedAt?.seconds || 0))
}

export async function removeScore(paperId) {
  const uid = auth?.currentUser?.uid
  if (uid) await deleteDoc(doc(db, 'leaderboard', paperId, 'scores', uid))
}
