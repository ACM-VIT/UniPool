// Native sibling so the shared AuthSheet import resolves on native. Native
// uses the real @react-native-google-signin button (handleGoogle) and never
// renders this; the GIS implementation lives in GoogleSignInButton.web.tsx.
import type React from "react";

const GoogleSignInButton: React.FC<any> = () => null;

export default GoogleSignInButton;
