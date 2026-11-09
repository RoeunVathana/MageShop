// Firebase Configuration & Initialization for TYUSHOP (tyushop-5aea2)
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBKs2OYgjUWXCO3JV32jFNrdSM5BdyzIIA',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'tyushop-5aea2.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tyushop-5aea2',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'tyushop-5aea2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '840016177617',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:840016177617:web:ec27c8d050c3cb066798f0',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-D9YSG88ZC5',
}

// Initialize Firebase App singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Firebase Auth & Google Auth Provider
export const auth = getAuth(app)
export const googleAuthProvider = new GoogleAuthProvider()
googleAuthProvider.setCustomParameters({ prompt: 'select_account' })

// Initialize Analytics conditionally (only in browser environment when supported)
export let analytics: ReturnType<typeof getAnalytics> | null = null

if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app)
      }
    })
    .catch(() => {
      // Analytics unsupported in current environment (e.g., adblocker)
    })
}

export default app

