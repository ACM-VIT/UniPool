import { getAuth, getIdTokenResult, signOut, updateProfile } from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import type ApiUtil from "./ApiUtil";

type AppleFullName = {
  namePrefix?: string | null;
  givenName?: string | null;
  middleName?: string | null;
  familyName?: string | null;
  nameSuffix?: string | null;
  nickname?: string | null;
};

export const isAuthenticationRedirectError = (error: any) =>
  error?.message === "AUTHENTICATION_REDIRECT" ||
  error?.status === 401 ||
  error?.response?.status === 401;

export const isSignupRequiredError = (error: any) =>
  error?.response?.status === 404 &&
  error?.response?.data?.message === "User not found in database, signup required";

export const isProviderCollisionError = (error: any) =>
  [
    "auth/account-exists-with-different-credential",
    "auth/email-already-in-use",
    "auth/credential-already-in-use",
  ].includes(String(error?.code ?? ""));

export const formatAppleFullName = (fullName?: AppleFullName | null) => {
  if (!fullName) return "";
  return [
    fullName.namePrefix,
    fullName.givenName,
    fullName.middleName,
    fullName.familyName,
    fullName.nameSuffix,
  ]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
};

export const primeFreshAuthToken = async (
  apiUtil: ApiUtil,
  firebaseUser: any,
  forceRefresh = false,
) => {
  if (!firebaseUser?.uid) return;
  const tokenResult = await getIdTokenResult(firebaseUser, forceRefresh);
  apiUtil.primeAuthToken(
    firebaseUser.uid,
    tokenResult.token,
    Date.parse(tokenResult.expirationTime),
  );
};

export const prepareAppleFirebaseUser = async (
  apiUtil: ApiUtil,
  firebaseUser: any,
  fullName?: AppleFullName | null,
) => {
  const displayName = formatAppleFullName(fullName);
  if (displayName && !String(firebaseUser?.displayName ?? "").trim()) {
    await updateProfile(firebaseUser, { displayName });
  }

  // Force-refresh after updateProfile so the backend sees the new
  // Firebase `name` claim on the very next request.
  await primeFreshAuthToken(apiUtil, firebaseUser, !!displayName);
};

export const rollbackFirebaseSession = async (
  apiUtil: ApiUtil,
  provider?: "apple" | "google",
) => {
  apiUtil.clearAuthTokenCache();
  try {
    await signOut(getAuth());
  } catch {
    // Already signed out or native auth is unavailable; either way,
    // local token state has been cleared.
  }
  if (provider === "google") {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Google may not be the active provider.
    }
  }
};
