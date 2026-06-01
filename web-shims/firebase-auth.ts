// Web alias for "@react-native-firebase/auth".
//
// The app already calls the modular auth API (getAuth, onAuthStateChanged,
// getIdTokenResult, GoogleAuthProvider, signInWithCredential, signOut,
// updateProfile, ...) which is identical in name and signature to the
// firebase/auth web SDK. So we initialize the default app from the web
// config and re-export firebase/auth wholesale. getAuth() with no
// argument resolves the default app, matching the native call sites.
import { getApps, initializeApp } from "firebase/app";
import { firebaseConfig } from "../config/firebaseConfig.web";

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

export * from "firebase/auth";
