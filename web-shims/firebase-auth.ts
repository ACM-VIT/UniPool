// Web alias for "@react-native-firebase/auth".
//
// The app already calls the modular auth API (getAuth, onAuthStateChanged,
// getIdTokenResult, GoogleAuthProvider, signInWithCredential, signOut,
// updateProfile, ...) which is identical in name and signature to the
// firebase/auth web SDK. So we initialize the default app from the web
// config and re-export firebase/auth wholesale. getAuth() with no
// argument resolves the default app, matching the native call sites.
import { getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider as FirebaseGoogleAuthProvider,
  signInWithCredential as firebaseSignInWithCredential,
  signInWithCustomToken,
} from "firebase/auth";
import { firebaseConfig } from "../config/firebaseConfig.web";
import { exchangeGoogleIdTokenForFirebaseCustomToken } from "../utils/googleWebTokenExchange";

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

export * from "firebase/auth";

const UNIPOOL_GOOGLE_ID_TOKEN = "__unipoolGoogleIdToken";

export class GoogleAuthProvider extends FirebaseGoogleAuthProvider {
  static credential(idToken?: string | null, accessToken?: string | null) {
    if (idToken) {
      return {
        providerId: "google.com",
        signInMethod: "google.com",
        [UNIPOOL_GOOGLE_ID_TOKEN]: idToken,
      } as any;
    }
    return FirebaseGoogleAuthProvider.credential(idToken, accessToken);
  }

  static credentialFromResult = FirebaseGoogleAuthProvider.credentialFromResult;
  static credentialFromError = FirebaseGoogleAuthProvider.credentialFromError;
}

export const signInWithCredential = async (auth: any, credential: any) => {
  const googleIdToken = credential?.[UNIPOOL_GOOGLE_ID_TOKEN];
  if (googleIdToken) {
    const customToken = await exchangeGoogleIdTokenForFirebaseCustomToken(googleIdToken);
    return signInWithCustomToken(auth, customToken);
  }
  return firebaseSignInWithCredential(auth, credential);
};
