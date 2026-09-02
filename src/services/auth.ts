import { FirebaseError } from 'firebase/app';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { firebaseAuth, signInWithGoogleClient } from './authClient';

export interface AuthIdentity {
  uid: string;
  name: string;
  email: string;
  provider: 'password' | 'google' | 'unknown';
}

function identityFromUser(user: User): AuthIdentity {
  const email = user.email ?? '';
  const providerId = user.providerData[0]?.providerId;
  return {
    uid: user.uid,
    name: user.displayName?.trim() || email.split('@')[0] || 'Calo Explorer',
    email,
    provider: providerId === 'google.com' ? 'google' : providerId === 'password' ? 'password' : 'unknown',
  };
}

function requireAuth() {
  if (!firebaseAuth) {
    throw new Error('Firebase is not configured yet. Add the EXPO_PUBLIC_FIREBASE_* values first.');
  }
  return firebaseAuth;
}

export function readableAuthError(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return error instanceof Error ? error.message : 'Sign-in could not be completed. Please try again.';
  }

  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account already exists for this email. Try logging in.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/network-request-failed': 'Network connection failed. Check your internet and try again.',
    'auth/popup-blocked': 'The Google sign-in popup was blocked. Allow popups and try again.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
  };

  return messages[error.code] ?? 'Sign-in could not be completed. Please try again.';
}

export async function createEmailAccount(name: string, email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
  await updateProfile(credential.user, { displayName: name.trim() });
  return identityFromUser(credential.user);
}

export async function signInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
  return identityFromUser(credential.user);
}

export async function signInWithGoogle() {
  const credential = await signInWithGoogleClient();
  return identityFromUser(credential.user);
}

export function observeAuth(callback: (identity: AuthIdentity | null) => void) {
  if (!firebaseAuth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(firebaseAuth, (user) => callback(user ? identityFromUser(user) : null));
}

export async function signOutAccount() {
  if (firebaseAuth) await signOut(firebaseAuth);
}
