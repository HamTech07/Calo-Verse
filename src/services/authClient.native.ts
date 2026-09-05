import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseError } from 'firebase/app';
import * as NativeAuth from 'firebase/auth';
import { Auth, GoogleAuthProvider, UserCredential, getAuth, Persistence, initializeAuth, signInWithCredential } from 'firebase/auth';
import { GoogleSignin, isCancelledResponse, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { firebaseApp } from './firebase';

let nativeAuth: Auth | null = null;
const { getReactNativePersistence } = NativeAuth as typeof NativeAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};
if (firebaseApp) {
  try {
    nativeAuth = initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (error) {
    if (!(error instanceof FirebaseError) || error.code !== 'auth/already-initialized') throw error;
    nativeAuth = getAuth(firebaseApp);
  }
}
export const firebaseAuth = nativeAuth;
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
if (webClientId) GoogleSignin.configure({ webClientId, offlineAccess: false });

export async function signInWithGoogleClient(): Promise<UserCredential> {
  if (!nativeAuth) throw new Error('Firebase is not initialized.');
  if (!webClientId) throw new Error('Google sign-in is not configured for this build.');
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (isCancelledResponse(response)) throw new Error('Google sign-in was cancelled.');
  if (!isSuccessResponse(response) || !response.data.idToken) throw new Error('Google did not return a valid sign-in token.');
  return signInWithCredential(nativeAuth, GoogleAuthProvider.credential(response.data.idToken));
}
