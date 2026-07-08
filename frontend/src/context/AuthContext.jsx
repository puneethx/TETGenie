import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../lib/firebase'

const AuthContext = createContext(null)

// Maps Firebase auth error codes to messages a teacher will understand.
function friendlyError(code) {
  const map = {
    'auth/email-already-in-use': 'An account with this email already exists. Try logging in.',
    'auth/invalid-email': 'That email address looks invalid.',
    'auth/weak-password': 'Password is too weak. Use at least 8 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Check your connection and retry.',
  }
  return map[code] || 'Something went wrong. Please try again.'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)       // Firebase auth user
  const [profile, setProfile] = useState(null) // Firestore users/{uid} doc
  const [loading, setLoading] = useState(true)

  // Watch auth state; when signed in, live-subscribe to the profile doc so
  // an admin flipping a user to Premium reflects instantly.
  useEffect(() => {
    // Before Firebase keys are added, run in a signed-out state instead of crashing.
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    let unsubProfile = null
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (unsubProfile) { unsubProfile(); unsubProfile = null }
      setUser(fbUser)
      if (fbUser) {
        const ref = doc(db, 'users', fbUser.uid)
        unsubProfile = onSnapshot(
          ref,
          (snap) => {
            setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null)
            setLoading(false)
          },
          () => setLoading(false),
        )
      } else {
        setProfile(null)
        setLoading(false)
      }
    })
    return () => {
      if (unsubProfile) unsubProfile()
      unsubAuth()
    }
  }, [])

  const signup = useCallback(async ({ firstName, lastName, email, password }) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const displayName = [firstName, lastName].filter(Boolean).join(' ').trim()
      if (displayName) await updateProfile(cred.user, { displayName })
      // Default new users to role "user" / "free". Admin is set manually in Firebase.
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        firstName: firstName.trim(),
        lastName: (lastName || '').trim(),
        email: email.trim().toLowerCase(),
        role: 'user',
        subscription: 'free',
        premiumSince: null,
        unlockedExams: [],
        createdAt: serverTimestamp(),
      })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: friendlyError(e.code) }
    }
  }, [])

  const login = useCallback(async ({ email, password }) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: friendlyError(e.code) }
    }
  }, [])

  const logout = useCallback(() => signOut(auth), [])

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: profile?.role === 'admin',
    isPremium: profile?.subscription === 'premium' || profile?.role === 'admin',
    signup,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
