import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';

const firebaseOptions: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const requiredConfig = {
  EXPO_PUBLIC_FIREBASE_API_KEY: firebaseOptions.apiKey,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseOptions.authDomain,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: firebaseOptions.projectId,
  EXPO_PUBLIC_FIREBASE_APP_ID: firebaseOptions.appId,
};

export const missingFirebaseConfig = Object.entries(requiredConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const isFirebaseConfigured = missingFirebaseConfig.length === 0;

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseOptions))
  : null;

export const firestoreDb: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
