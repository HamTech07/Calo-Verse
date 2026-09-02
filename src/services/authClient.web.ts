import {
  Auth,
  GoogleAuthProvider,
  UserCredential,
  getAuth,
  signInWithPopup,
} from 'firebase/auth';
import { firebaseApp } from './firebase';

export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;

export function signInWithGoogleClient(): Promise<UserCredential> {
  if (!firebaseAuth) {
    return Promise.reject(new Error('Firebase is not configured yet.'));
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(firebaseAuth, provider);
}
