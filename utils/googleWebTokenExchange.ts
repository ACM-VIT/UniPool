import baseURL from "../config/urlconfig";

type GoogleWebExchangeResponse = {
  firebase_custom_token?: string;
  error?: string;
};

export const exchangeGoogleIdTokenForFirebaseCustomToken = async (idToken: string) => {
  const response = await fetch(new URL("/auth/google-web", baseURL).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });

  const text = await response.text();
  let body: GoogleWebExchangeResponse = {};
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text.trim() };
    }
  }

  if (!response.ok || !body.firebase_custom_token) {
    const error: any = new Error(body.error || "Could not exchange Google sign-in with UniPool.");
    error.status = response.status;
    error.response = { status: response.status, data: body };
    throw error;
  }

  return body.firebase_custom_token;
};
