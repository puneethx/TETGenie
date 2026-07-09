// Firestore data layer for daily AI-generated papers (Premium).
//
//   dailyPapers/{id}                 ← metadata (title/date/stats) — any signed-in user
//   dailyPapers/{id}/secure/otp      ← { otp } — Premium only
//   dailyPapers/{id}/data/questions  ← { items:[...] } — Premium only
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc,
  query, orderBy, serverTimestamp, arrayUnion,
} from 'firebase/firestore'
import { db, auth } from './firebase'

export function newDailyId(date) {
  return `daily-${date}-${Date.now().toString(36)}`
}

// 6-digit OTP that changes per paper.
export function makeOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function listDailyPapers() {
  const q = query(collection(db, 'dailyPapers'), orderBy('date', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getDailyPaper(id) {
  const s = await getDoc(doc(db, 'dailyPapers', id))
  return s.exists() ? { id: s.id, ...s.data() } : null
}

export async function getDailyQuestions(id) {
  const s = await getDoc(doc(db, 'dailyPapers', id, 'data', 'questions'))
  return s.exists() ? s.data().items || [] : []
}

// Premium members (and admins) can read the OTP doc.
export async function getDailyOtp(id) {
  const s = await getDoc(doc(db, 'dailyPapers', id, 'secure', 'otp'))
  return s.exists() ? s.data().otp : null
}

export async function publishDailyPaper({ date, title, questions, stats, otp, free = false }) {
  const id = newDailyId(date)
  await setDoc(doc(db, 'dailyPapers', id), {
    title: title || `Daily Paper — ${date}`,
    date,
    type: 'daily',
    totalQuestions: questions.length,
    free: Boolean(free),        // free papers open for everyone, no OTP/Premium
    stats: stats || {},
    published: true,
    createdAt: serverTimestamp(),
    createdBy: auth?.currentUser?.uid || null,
  })
  await setDoc(doc(db, 'dailyPapers', id, 'data', 'questions'), { items: questions })
  await setDoc(doc(db, 'dailyPapers', id, 'secure', 'otp'), { otp })
  return id
}

// Admin: mark a daily paper free (open to all) or back to Premium-only.
export async function setDailyFree(id, free) {
  await updateDoc(doc(db, 'dailyPapers', id), { free: Boolean(free) })
}

// Admin: overwrite a daily paper's questions (edit answers / add missing ones).
export async function saveDailyQuestions(id, questions) {
  await setDoc(doc(db, 'dailyPapers', id, 'data', 'questions'), { items: questions })
  await updateDoc(doc(db, 'dailyPapers', id), { totalQuestions: questions.length })
}

// Verify the OTP the user typed and, if correct, record the unlock on their
// own profile. (OTP read requires Premium — enforced by rules.)
export async function unlockDaily(id, entered) {
  const otp = await getDailyOtp(id)
  if (!otp || String(entered).trim() !== String(otp)) return false
  const uid = auth?.currentUser?.uid
  if (uid) await updateDoc(doc(db, 'users', uid), { unlockedExams: arrayUnion(id) })
  return true
}

export async function deleteDailyPaper(id) {
  await deleteDoc(doc(db, 'dailyPapers', id, 'data', 'questions'))
  await deleteDoc(doc(db, 'dailyPapers', id, 'secure', 'otp'))
  await deleteDoc(doc(db, 'dailyPapers', id))
}
