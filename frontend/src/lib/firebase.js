// Firebase initialisation. Reads config from Vite env vars (VITE_FIREBASE_*).
// See .env.example and the README for how to obtain these values.
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// True only once the .env file is filled in. All VITE_* vars are embedded in
// the client bundle — that is expected for Firebase web config; security is
// enforced by Firebase Security Rules, NOT by hiding these keys.
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

// IMPORTANT: getAuth() throws `auth/invalid-api-key` with an empty config, so we
// only initialise the SDK once real keys exist. Before that (fresh clone, no
// .env yet), the app still renders — Home works, and the auth screens show a
// "configure Firebase" message instead of crashing.
let app = null
let auth = null
let db = null
let storage = null

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
}

export { auth, db, storage }
export default app
