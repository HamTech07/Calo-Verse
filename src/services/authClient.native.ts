import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseError } from 'firebase/app';
import * as NativeAuth from 'firebase/auth';
import {
  Auth,
  UserCredential,
  getAuth,
  Persistence,
  initializeAuth,
} from 'firebase/auth';
import { firebaseApp } from './firebase';

let nativeAuth: Auth | null = null;

// Firebase 12's RN runtime exports this, but its top-level public types omit it.
const { getReactNativePersistence } = NativeAuth as typeof NativeAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

if (firebaseApp) {
  try {
    nativeAuth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if (!(error instanceof FirebaseError) || error.code !== 'auth/already-initialized') throw error;
    nativeAuth = getAuth(firebaseApp);
  }
}

export const firebaseAuth = nativeAuth;

export function signInWithGoogleClient(): Promise<UserCredential> {
  return Promise.reject(
    new Error('Google sign-in on Android and iOS is not connected yet. Please use email for now.'),
  );
}
