// Admin-only helpers for the user-management screen.
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

// Simple in-memory cache so re-opening the Users tab is instant (users change
// rarely). Cleared on full reload; use the Refresh button to force a re-fetch.
let _cache = null

export async function listUsers({ force = false } = {}) {
  if (_cache && !force) return _cache
  const snap = await getDocs(collection(db, 'users'))
  _cache = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
  return _cache
}

// Keep the cache in sync after an admin edit (so navigating away & back is correct).
function patchCache(uid, fields) {
  if (!_cache) return
  _cache = _cache.map((u) => (u.id === uid ? { ...u, ...fields } : u))
}

// Flip a user's subscription. Allowed only for admins (enforced by rules).
export async function setSubscription(uid, subscription) {
  await updateDoc(doc(db, 'users', uid), {
    subscription,
    premiumSince: subscription === 'premium' ? serverTimestamp() : null,
  })
  patchCache(uid, { subscription })
}
