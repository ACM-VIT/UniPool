// Web alias for "@react-native-google-signin/google-signin".
//
// On native this wraps the Google Sign-In SDK. On web we implement the
// same small surface the app uses (configure / signIn / signInSilently /
// getCurrentUser / getTokens / signOut / hasPlayServices) on top of the
// firebase/auth web SDK. signIn() opens the standard Google popup and
// returns an idToken in the same shape the native module does, so the
// shared caller code (which builds a GoogleAuthProvider credential and
// calls signInWithCredential) works unchanged.
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";

type ConfigureOptions = {
  webClientId?: string;
  iosClientId?: string;
  offlineAccess?: boolean;
  forceCodeForRefreshToken?: boolean;
  scopes?: string[];
};

let configuredOptions: ConfigureOptions = {};

const shapeUser = (user: {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}) => ({
  id: user.uid,
  name: user.displayName,
  email: user.email,
  photo: user.photoURL,
  familyName: null,
  givenName: null,
});

export const GoogleSignin = {
  configure(options: ConfigureOptions = {}) {
    configuredOptions = options;
  },

  async hasPlayServices() {
    // No Play Services concept on web; report available so callers proceed.
    return true;
  },

  getCurrentUser() {
    const user = getAuth().currentUser;
    if (!user) return null;
    return { user: shapeUser(user), idToken: null, scopes: configuredOptions.scopes ?? [] };
  },

  async signInSilently() {
    // The web SDK restores a prior session from its own persistence, so
    // there is no separate silent Google handshake to run. Reject so the
    // caller falls through to its normal signed-out handling.
    throw new Error("signInSilently is not supported on web");
  },

  async getTokens() {
    const user = getAuth().currentUser;
    if (!user) throw new Error("No Google user is currently signed in");
    const idToken = await user.getIdToken();
    return { idToken, accessToken: "" };
  },

  async signIn() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(getAuth(), provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const idToken = credential?.idToken ?? (await result.user.getIdToken());
    const user = shapeUser(result.user);
    return { type: "success" as const, idToken, data: { idToken, user }, user };
  },

  async signOut() {
    try {
      await firebaseSignOut(getAuth());
    } catch {
      // Already signed out; nothing to do.
    }
  },

  async revokeAccess() {
    await this.signOut();
  },
};

export const statusCodes = {
  SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  IN_PROGRESS: "IN_PROGRESS",
  PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
  SIGN_IN_REQUIRED: "SIGN_IN_REQUIRED",
};

export default { GoogleSignin, statusCodes };
