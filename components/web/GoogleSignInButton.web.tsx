// Web-only "Continue with Google" using Google Identity Services — the same
// GIS flow AuthScreen.web uses. Google returns an ID token, then the caller
// exchanges it through UniPool's backend for a Firebase custom-token session.
//
// Renders GIS's own native button into a div; while GIS is loading or if it
// can't load, the caller controls the fallback UI.
import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator } from "react-native";

// Web OAuth 2.0 client ID (same one AuthScreen.web / GoogleSignin.configure use).
const WEB_CLIENT_ID = "290309531485-vnb7pgofegur0g8456f3k9lbutgo89fq.apps.googleusercontent.com";

type Props = {
  /** Render/refresh the GIS button while true (e.g. while the sheet is open). */
  enabled: boolean;
  /** Show a spinner instead of the button while exchanging the credential. */
  busy?: boolean;
  /** Called with the Google ID token; caller does signInWithCredential. */
  onIdToken: (idToken: string) => void;
  /** Shown if GIS can't load (the legacy Firebase-popup button). */
  fallback: React.ReactNode;
};

const GoogleSignInButton: React.FC<Props> = ({ enabled, busy, onIdToken, fallback }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const cbRef = useRef(onIdToken);
  cbRef.current = onIdToken;

  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;
    let cancelled = false;
    const render = () => {
      const g = (window as any).google;
      if (cancelled || !g?.accounts?.id || !ref.current) return;
      try {
        g.accounts.id.initialize({
          client_id: WEB_CLIENT_ID,
          callback: (resp: any) => { if (resp?.credential) cbRef.current(resp.credential); },
          ux_mode: "popup",
        });
        ref.current.innerHTML = "";
        g.accounts.id.renderButton(ref.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "center",
          width: 320,
        });
        setReady(true);
      } catch {
        /* leave ready=false so the fallback button shows */
      }
    };
    if ((window as any).google?.accounts?.id) {
      render();
      return () => { cancelled = true; };
    }
    let script = document.getElementById("gis-client") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.id = "gis-client";
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    return () => {
      cancelled = true;
      script?.removeEventListener("load", render);
    };
  }, [enabled]);

  if (busy) {
    return (
      <View style={{ height: 48, alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
        <ActivityIndicator color="#263B33" />
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 22, alignItems: "center" }}>
      {/* @ts-ignore raw DOM node — this file only runs on web */}
      <div ref={ref} style={{ display: ready ? "flex" : "none", justifyContent: "center", minHeight: ready ? 44 : 0 }} />
      {!ready ? fallback : null}
    </View>
  );
};

export default GoogleSignInButton;
