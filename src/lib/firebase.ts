import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAAMD1Sv12XEei8kyzP-Nlf5ORWVdOWrFA",
  authDomain: "restaurant-manager-e1e4b.firebaseapp.com",
  projectId: "restaurant-manager-e1e4b",
  storageBucket: "restaurant-manager-e1e4b.firebasestorage.app",
  messagingSenderId: "84119363068",
  appId: "1:84119363068:web:1eb376a47117ede0306679",
  measurementId: "G-SZQD4HC748"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize Analytics - only in browser environment
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, auth, db, storage, analytics };
