// Web shim for expo-apple-authentication.
//
// Sign in with Apple through this native module is iOS only. On web,
// isAvailableAsync returns false, which is exactly how the auth screens
// already decide whether to show the Apple button, so the button is
// hidden and signInAsync is never reached. (A future web Apple sign-in
// would use Apple's Services ID via firebase OAuthProvider, separately.)
export const AppleAuthenticationScope = { FULL_NAME: 0, EMAIL: 1 } as const;
export const AppleAuthenticationCredentialState = {
  REVOKED: 0,
  AUTHORIZED: 1,
  NOT_FOUND: 2,
  TRANSFERRED: 3,
} as const;
export const AppleAuthenticationButtonType = { SIGN_IN: 0, CONTINUE: 1, SIGN_UP: 2 } as const;
export const AppleAuthenticationButtonStyle = { WHITE: 0, WHITE_OUTLINE: 1, BLACK: 2 } as const;

export async function isAvailableAsync(): Promise<boolean> {
  return false;
}

export async function signInAsync(_options?: unknown): Promise<never> {
  throw new Error("Sign in with Apple is not available on web");
}

export async function getCredentialStateAsync(_user: string) {
  return AppleAuthenticationCredentialState.NOT_FOUND;
}

export default {
  AppleAuthenticationScope,
  AppleAuthenticationCredentialState,
  AppleAuthenticationButtonType,
  AppleAuthenticationButtonStyle,
  isAvailableAsync,
  signInAsync,
  getCredentialStateAsync,
};
