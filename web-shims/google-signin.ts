// Web alias for "@react-native-google-signin/google-signin".
//
// On native this wraps the Google Sign-In SDK. On web we implement the
// same small surface the app uses (configure / signIn / signInSilently /
// getCurrentUser / getTokens / signOut / hasPlayServices) on top of the
// Google Identity Services. signIn() returns a Google ID token in the same
// shape the native module does, so shared caller code can pass it through
// GoogleAuthProvider.credential; the firebase-auth web shim exchanges that
// GIS token through UniPool's backend instead of Firebase's OAuth popup.
import {
  getAuth,
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
let gisScriptPromise: Promise<any> | null = null;

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

const loadGoogleIdentityServices = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Identity Services is only available in the browser"));
  }

  const existing = (window as any).google?.accounts?.id;
  if (existing) return Promise.resolve(existing);

  if (gisScriptPromise) return gisScriptPromise;

  gisScriptPromise = new Promise((resolve, reject) => {
    let script = document.getElementById("gis-client") as HTMLScriptElement | null;
    const onLoad = () => {
      const gis = (window as any).google?.accounts?.id;
      gis ? resolve(gis) : reject(new Error("Google Identity Services did not initialize"));
    };
    const onError = () => reject(new Error("Google Identity Services failed to load"));

    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.id = "gis-client";
      document.head.appendChild(script);
    }

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
  });

  return gisScriptPromise;
};

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
    const gis = await loadGoogleIdentityServices();
    const clientId = configuredOptions.webClientId;
    if (!clientId) {
      throw new Error("GoogleSignin.configure({ webClientId }) must be called before signIn()");
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      let timeout: ReturnType<typeof setTimeout>;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        fn();
      };
      const cancelError: any = new Error("Google sign-in was cancelled");
      cancelError.code = statusCodes.SIGN_IN_CANCELLED;

      timeout = setTimeout(() => {
        finish(() => reject(cancelError));
      }, 60_000);

      gis.initialize({
        client_id: clientId,
        callback: (resp: any) => {
          const idToken = resp?.credential;
          if (!idToken) {
            finish(() => reject(cancelError));
            return;
          }
          const currentUser = getAuth().currentUser;
          const user = currentUser
            ? shapeUser(currentUser)
            : {
                id: "",
                name: null,
                email: null,
                photo: null,
                familyName: null,
                givenName: null,
              };
          finish(() => resolve({ type: "success" as const, idToken, data: { idToken, user }, user }));
        },
        ux_mode: "popup",
      });

      gis.prompt((notification: any) => {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          finish(() => reject(cancelError));
        }
      });
    });
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
