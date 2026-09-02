import { Auth, UserCredential, getAuth } from 'firebase/auth';
import { firebaseApp } from './firebase';

export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;

export function signInWithGoogleClient(): Promise<UserCredential> {
  return Promise.reject(
    new Error('Google sign-in on this platform is not connected yet. Please use email for now.'),
  );
}
