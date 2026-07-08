// Admin-only helpers for the user-management screen.
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export async function listUsers() {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
}

// Flip a user's subscription. Allowed only for admins (enforced by rules).
export async function setSubscription(uid, subscription) {
  await updateDoc(doc(db, 'users', uid), {
    subscription,
    premiumSince: subscription === 'premium' ? serverTimestamp() : null,
  })
}
