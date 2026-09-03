import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseError } from 'firebase/app';
import * as NativeAuth from 'firebase/auth';
import {
  Auth,
  GoogleAuthProvider,
  UserCredential,
  getAuth,
  Persistence,
  initializeAuth,
  signInWithCredential,
} from 'firebase/auth';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { firebaseApp } from './firebase';

// Required for expo-auth-session on Android
WebBrowser.maybeCompleteAuthSession();

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

// Web Client ID from google-services.json (client_type: 3)
const WEB_CLIENT_ID =
  '727919495971-pt308h42n8n9kiamhf93l3ahrgbpnaps.apps.googleusercontent.com';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export function signInWithGoogleClient(): Promise<UserCredential> {
  if (!nativeAuth) {
    return Promise.reject(new Error('Firebase not initialized'));
  }

  return new Promise(async (resolve, reject) => {
    try {
      // For native Android, Google requires the reverse client ID as the redirect URI scheme.
      // Format: com.googleusercontent.apps.{number}:/oauth2redirect
      // This requires NO changes in Google Cloud Console.
      const REVERSE_CLIENT_ID =
        'com.googleusercontent.apps.727919495971-pt308h42n8n9kiamhf93l3ahrgbpnaps';
      const redirectUri = `${REVERSE_CLIENT_ID}:/oauth2redirect`;

      const request = new AuthSession.AuthRequest({
        clientId: WEB_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
        usePKCE: false,
        extraParams: { nonce: Math.random().toString(36).substring(2) },
      });

      await request.makeAuthUrlAsync(discovery);
      const result = await request.promptAsync(discovery);

      if (result.type === 'success' && result.params?.id_token) {
        const credential = GoogleAuthProvider.credential(result.params.id_token);
        const userCredential = await signInWithCredential(nativeAuth!, credential);
        resolve(userCredential);
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        reject(new Error('Google sign-in was cancelled.'));
      } else {
        reject(new Error('Google sign-in failed. Please try again.'));
      }
    } catch (err) {
      reject(err);
    }
  });
}
