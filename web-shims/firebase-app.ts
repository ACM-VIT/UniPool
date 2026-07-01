// Web alias for "@react-native-firebase/app".
//
// Ensures the default Firebase app is initialized from the web config
// before anything reads it, then re-exports the firebase/app modular
// API so any code importing from "@react-native-firebase/app" resolves
// to the equivalent web functions.
import { getApps, initializeApp } from "firebase/app";
import { firebaseConfig } from "../config/firebaseConfig.web";

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

export * from "firebase/app";
