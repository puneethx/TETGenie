// Firestore data layer for question papers.
//
// Data model:
//   papers/{paperId}                     ← lightweight metadata (for the list)
//   papers/{paperId}/data/questions      ← one doc: { items: [ ...questions ] }
//
// Storing questions in a single sub-doc keeps the papers list cheap (1 read per
// list) and a full paper cheap to open (1 read), and stays well under the 1 MB
// Firestore document limit for a 150-question bilingual paper.
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db, auth } from './firebase'

export function newPaperId(year) {
  const y = year || 'na'
  return `py-${y}-${Date.now().toString(36)}`
}

// List all papers, newest first (metadata only).
export async function listPapers() {
  const q = query(collection(db, 'papers'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getPaper(paperId) {
  const snap = await getDoc(doc(db, 'papers', paperId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getPaperQuestions(paperId) {
  const snap = await getDoc(doc(db, 'papers', paperId, 'data', 'questions'))
  return snap.exists() ? snap.data().items || [] : []
}

// Flatten questions from published previous-year papers into a "bank" for the
// daily-paper generator (used as reuse pool + style examples).
export async function loadBank(maxPapers = 12) {
  const all = await listPapers()
  const chosen = all.slice(0, maxPapers)
  const bank = []
  for (const p of chosen) {
    const qs = await getPaperQuestions(p.id)
    for (const q of qs) {
      bank.push({
        subject: q.subject, topic: q.topic, difficulty: q.difficulty,
        englishQuestion: q.englishQuestion, teluguQuestion: q.teluguQuestion,
        options: q.options, correctOption: q.correctOption,
        explanation: q.explanation, explanationTelugu: q.explanationTelugu,
      })
    }
  }
  return bank
}

// Create/overwrite a paper + its questions. `questions` is the array from the
// extraction backend (already reviewed/edited by the admin).
export async function publishPaper({ paperId, title, year, sourceFile, questions, stats }) {
  const id = paperId || newPaperId(year)
  const meta = {
    title: title || `Previous Year ${year || ''}`.trim(),
    type: 'previous-year',
    year: year || null,
    sourceFile: sourceFile || '',
    totalQuestions: questions.length,
    stats: stats || {},
    published: true,
    createdAt: serverTimestamp(),
    createdBy: auth?.currentUser?.uid || null,
  }
  await setDoc(doc(db, 'papers', id), meta)
  await setDoc(doc(db, 'papers', id, 'data', 'questions'), { items: questions })
  return id
}

// Admin edit: overwrite just the questions (e.g. after correcting answers).
export async function saveQuestions(paperId, questions) {
  await setDoc(doc(db, 'papers', paperId, 'data', 'questions'), { items: questions })
  await updateDoc(doc(db, 'papers', paperId), { totalQuestions: questions.length })
}

export async function deletePaper(paperId) {
  await deleteDoc(doc(db, 'papers', paperId, 'data', 'questions'))
  await deleteDoc(doc(db, 'papers', paperId))
}
