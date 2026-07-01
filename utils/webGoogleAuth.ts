import { getAuth, signInWithCustomToken } from "@react-native-firebase/auth";
import { exchangeGoogleIdTokenForFirebaseCustomToken } from "./googleWebTokenExchange";

export const signInToFirebaseWithGoogleIdToken = async (idToken: string) => {
  const customToken = await exchangeGoogleIdTokenForFirebaseCustomToken(idToken);
  return signInWithCustomToken(getAuth(), customToken);
};
