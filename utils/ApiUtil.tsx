import { getAuth, getIdTokenResult, signOut } from "@react-native-firebase/auth";
import { router } from "expo-router";
import React, { createContext, useContext, useState } from "react";
import baseURL from "../config/urlconfig";
import { useErrorContext } from '../contexts/ErrorContext';
import { appHref } from "../navigation/routes";

type JSON = {
  [key: string]: string | number | boolean | JSON;
};

export default class ApiUtil {
  private baseUrl: string;
  private showError?: (error: any, retryAction?: () => void) => void;
  private isAppInitialized: boolean = true;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setErrorHandler(showError: (error: any, retryAction?: () => void) => void) {
    this.showError = showError;
  }

  private async handleAuthenticationFailure(): Promise<void> {
    try {
      console.log("Authentication failure - signing out user");
      const authInstance = getAuth();
      await signOut(authInstance);
      
      try {
        const GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
        await GoogleSignin.signOut();
        console.log("Google sign out completed");
      } catch (googleError) {
        console.log("Google sign out error (might not be signed in):", googleError);
      }
      
      setTimeout(() => {
        console.log("Navigating to AuthScreen");
        router.replace(appHref("AuthScreen"));
      }, 100);
      
    } catch (error) {
      console.error("Error during authentication failure handling:", error);
    }
  }

  async get<T>(endpoint: string, headers?: HeadersInit, timeout?: number): Promise<T> {
    const retryAction = () => this.get<T>(endpoint, headers, timeout);
    return this.makeRequestWithErrorHandling<T>("GET", endpoint, undefined, headers, timeout, retryAction);
  }

  async post<T, B>(endpoint: string, body: B, headers?: HeadersInit, timeout?: number): Promise<T> {
    const retryAction = () => this.post<T, B>(endpoint, body, headers, timeout);
    return this.makeRequestWithErrorHandling<T>("POST", endpoint, body, headers, timeout, retryAction);
  }

  async put<T, B>(endpoint: string, body: B, headers?: HeadersInit, timeout?: number): Promise<T> {
    const retryAction = () => this.put<T, B>(endpoint, body, headers, timeout);
    return this.makeRequestWithErrorHandling<T>("PUT", endpoint, body, headers, timeout, retryAction);
  }

  async patch<T, B>(endpoint: string, body: B, headers?: HeadersInit, timeout?: number): Promise<T> {
    const retryAction = () => this.patch<T, B>(endpoint, body, headers, timeout);
    return this.makeRequestWithErrorHandling<T>("PATCH", endpoint, body, headers, timeout, retryAction);
  }

  async delete<T>(endpoint: string, headers?: HeadersInit, timeout?: number): Promise<T> {
    const retryAction = () => this.delete<T>(endpoint, headers, timeout);
    return this.makeRequestWithErrorHandling<T>("DELETE", endpoint, undefined, headers, timeout, retryAction);
  }

  getCurrentUserId(): string | null {
    return getAuth().currentUser?.uid ?? null;
  }

  private async makeRequestWithErrorHandling<T>(
    method: string,
    endpoint: string,
    body?: any,
    headers: HeadersInit = {},
    timeout: number = 20000,
    retryAction?: () => Promise<T>
  ): Promise<T> {
    try {
      return await this.makeRequest<T>(method, endpoint, body, headers, timeout);
    } catch (error: any) {
      console.log('Error caught in makeRequestWithErrorHandling:', error);
      
      if (error instanceof Error && error.message === "AUTHENTICATION_REDIRECT") {
        throw error;
      }
      
      if (error?.response?.status === 401) {
        console.log('Authentication error (401) - user needs to log in again');
        await this.handleAuthenticationFailure();
        throw new Error("AUTHENTICATION_REDIRECT");
      }
      
      if (error?.response?.status === 403) {
        console.log('Authorization error (403) - user lacks permission but is authenticated');
        throw error; // Don't sign out for permission errors
      }
      
      if (error?.message?.includes('Unauthorized') || 
          error?.message?.includes('JSON Parse error: Unexpected character: U')) {
        console.log('Unauthorized response detected - handling as auth error');
        await this.handleAuthenticationFailure();
        throw new Error("AUTHENTICATION_REDIRECT");
      }
      
      if (
        error?.response?.status === 404 &&
        endpoint === "/user/details" &&
        error?.response?.data?.message === "User not found in database, signup required"
      ) {
        console.log('User not found in database - redirecting to signup screen');
        setTimeout(() => {
          router.navigate(appHref("SignUpScreen", {
            newUser: error.response.data.newUser,
          }));
        }, 100);
        throw error;
      }
      
      if (this.showError && retryAction && this.isAppInitialized &&
          error?.response?.status !== 401 && 
          error?.response?.status !== 403 &&
          error?.response?.status !== 404 &&
          !error?.message?.includes('AUTHENTICATION_REDIRECT')) {
        console.log('Showing error modal for:', error);
        this.showError(error, retryAction);
        throw error;
      } else {
        console.log('No error handler needed - auth error, signup redirect, or app not initialized yet');
      }
      
      throw error;
    }
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    body?: any,
    headers: HeadersInit = {},
    timeout: number = 20000
  ): Promise<T> {
    const url = new URL(endpoint, this.baseUrl).toString();
    console.log(`Making ${method} request to: ${url}`);

    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;
    if (!currentUser) {
      console.warn("❌ No authenticated user found - redirecting to auth");
      await this.handleAuthenticationFailure();
      throw new Error("AUTHENTICATION_REDIRECT");
    }
    
    let token: string;
    try {
      const tokenResult = await getIdTokenResult(currentUser, true);
      token = tokenResult.token;
      
      const expirationTime = new Date(tokenResult.expirationTime);
      const now = new Date();
      const minutesUntilExpiry = (expirationTime.getTime() - now.getTime()) / (1000 * 60);
      
      if (minutesUntilExpiry < 5) {
        console.log("Token expires soon, forcing refresh...");
        const freshTokenResult = await getIdTokenResult(currentUser, true);
        token = freshTokenResult.token;
      }
      
    } catch (tokenError) {
      console.error("Failed to get authentication token:", tokenError);
      await this.handleAuthenticationFailure();
      throw new Error("AUTHENTICATION_REDIRECT");
    }

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    };

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      let responseBody: string | JSON;
      const responseText = await response.clone().text();
      
      try {
        if (!responseText.trim()) {
          if (response.ok) {
            console.log(`${method} ${url} returned an empty successful response`);
            return {} as T;
          }
          throw new Error("Empty response");
        }
        
        if (responseText.trim() === 'Unauthorized') {
          console.log("Detected unauthorized text response");
          responseBody = { error: responseText.trim() };
        } else if (responseText.trim() === 'Forbidden') {
          console.log("Detected forbidden text response");
          responseBody = { error: responseText.trim() };
        } else if (responseText.includes('\ufffd') || responseText.includes('�')) {
          console.error("Response contains invalid characters (encoding issue):", responseText.substring(0, 100));
          throw new Error("Response contains invalid characters - possible encoding issue");
        } else {
          responseBody = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.error("Raw response text:", responseText.substring(0, 200));
        
        if (response.ok && !responseText.trim()) {
          console.log(`${method} ${url} had an empty successful response - treating as success`);
          return {} as T;
        }
        
        if (responseText.trim() === 'Unauthorized') {
          console.log("Unauthorized response detected during JSON parse error");
          responseBody = { error: responseText.trim() };
        } else if (responseText.trim() === 'Forbidden') {
          console.log("Forbidden response detected during JSON parse error");
          responseBody = { error: responseText.trim() };
        } else if (parseError instanceof SyntaxError) {
          throw new Error(`Invalid JSON response: ${parseError.message}`);
        } else {
          responseBody = responseText;
        }
      }

      if (!response.ok) {
        console.error(`HTTP ${method} ${url} error ${response.status}:`, responseBody);
        if (response.status === 401) {
          console.warn("User authentication failed (401) - signing out and redirecting to auth");
          await this.handleAuthenticationFailure();
          throw new Error("AUTHENTICATION_REDIRECT");
        }
        if (response.status === 403) {
          console.warn("User authorization failed (403) - user lacks permission but is authenticated");
          // Don't sign out for permission errors, just throw the error
        }
        // Throw a custom error object with status and responseBody
        const error: any = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        error.response = { status: response.status, data: responseBody };
        throw error;
      }

      return responseBody as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.error(`Timeout: ${method} ${url}`);
        throw new Error(`Timeout: ${method} ${url}`);
      }

      console.error(`Network error: ${method} ${url}`, error);
      throw error;
    } finally {
      clearTimeout(id);
    }
  }
}

// ---------- Context + Provider ----------
export const DataContext = createContext<{
  apiUtil: ApiUtil;
  revalidate: boolean;
  triggerRevalidation: () => void;
}>({
  apiUtil: new ApiUtil(""),
  revalidate: false,
  triggerRevalidation: () => {},
});

export const ApiProvider = ({ children }: { children: React.ReactNode }) => {
  const [revalidate, setRevalidate] = useState(false);
  const [apiUtil] = useState(() => {
    const util = new ApiUtil(baseURL);
    return util;
  });

  const triggerRevalidation = () => {
    setRevalidate(true);
    setTimeout(() => setRevalidate(false), 10);
  };

  return (
    <DataContext.Provider value={{ apiUtil, revalidate, triggerRevalidation }}>
      <ApiErrorHandler apiUtil={apiUtil}>
        {children}
      </ApiErrorHandler>
    </DataContext.Provider>
  );
};

const ApiErrorHandler: React.FC<{ children: React.ReactNode; apiUtil: ApiUtil }> = ({ children, apiUtil }) => {
  let errorContext: any = null;
  const [isInitialized, setIsInitialized] = useState(false);
  
  try {
    errorContext = useErrorContext();
  } catch (error) {
    console.log('ErrorContext not available in ApiErrorHandler');
  }

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (errorContext?.showError) {
        console.log('Setting up error handler in ApiUtil (delayed)');
        apiUtil.setErrorHandler(errorContext.showError);
        setIsInitialized(true);
      } else {
        console.log('Error context not available yet');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [apiUtil, errorContext?.showError]);

  return <>{children}</>;
};

export const useApi = () => useContext(DataContext);
