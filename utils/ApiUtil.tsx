import { getAuth, getIdTokenResult, signOut } from "@react-native-firebase/auth";
import React, { createContext, useContext, useState } from "react";
import baseURL from "../config/urlconfig";
import { CommonActions } from '@react-navigation/native';
import { useErrorContext } from '../contexts/ErrorContext';

type JSON = {
  [key: string]: string | number | boolean | JSON;
};

export default class ApiUtil {
  private baseUrl: string;
  private navigationRef?: any;
  private showError?: (error: any, retryAction?: () => void) => void;

  constructor(baseUrl: string, navigationRef?: any) {
    this.baseUrl = baseUrl;
    this.navigationRef = navigationRef;
  }

  setNavigationRef(navigationRef: any) {
    this.navigationRef = navigationRef;
  }

  setErrorHandler(showError: (error: any, retryAction?: () => void) => void) {
    this.showError = showError;
  }

  private async handleAuthenticationFailure(): Promise<void> {
    try {
      const authInstance = getAuth();
      await signOut(authInstance);
      
      if (this.navigationRef && this.navigationRef.isReady && this.navigationRef.isReady()) {
        this.navigationRef.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'AuthScreen' }],
          })
        );
      } else {
        console.log("Navigation ref not available for automatic redirect");
      }
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
    } catch (error) {
      console.log('Error caught in makeRequestWithErrorHandling:', error);
      
      if (error instanceof Error && error.message === "AUTHENTICATION_REDIRECT") {
        throw error;
      }
      
      if (this.showError && retryAction) {
        console.log('Showing error modal for:', error);
        this.showError(error, retryAction);
        throw error;
      } else {
        console.log('No error handler available, error handler exists:', !!this.showError);
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
      console.warn("No authenticated user found - redirecting to auth");
      await this.handleAuthenticationFailure();
      throw new Error("AUTHENTICATION_REDIRECT");
    }
    
    let token: string;
    try {
      const tokenResult = await getIdTokenResult(currentUser);
      token = tokenResult.token;
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
          throw new Error("Empty response");
        }
        
        if (responseText.includes('\ufffd') || responseText.includes('�')) {
          console.error("Response contains invalid characters (encoding issue):", responseText.substring(0, 100));
          throw new Error("Response contains invalid characters - possible encoding issue");
        }
        
        responseBody = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.error("Raw response text:", responseText.substring(0, 200));
        
        if (parseError instanceof SyntaxError) {
          throw new Error(`Invalid JSON response: ${parseError.message}`);
        }
        
        responseBody = responseText;
      }

      if (!response.ok) {
        console.error(`HTTP ${method} ${url} error ${response.status}:`, responseBody);
        if (response.status === 401) {
          console.warn("User authentication failed - signing out and redirecting to auth");
          await this.handleAuthenticationFailure();
          throw new Error("AUTHENTICATION_REDIRECT");
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

export const ApiProvider = ({ children, navigationRef }: { children: React.ReactNode, navigationRef?: React.RefObject<any> }) => {
  const [revalidate, setRevalidate] = useState(false);
  const [apiUtil] = useState(() => {
    const util = new ApiUtil(baseURL);
    if (navigationRef) {
      util.setNavigationRef(navigationRef.current);
    }
    return util;
  });

  // Update navigation ref when it changes
  React.useEffect(() => {
    if (navigationRef?.current) {
      apiUtil.setNavigationRef(navigationRef.current);
    }
  }, [navigationRef?.current, apiUtil]);

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
  try {
    errorContext = useErrorContext();
  } catch (error) {
    console.log('ErrorContext not available in ApiErrorHandler');
  }

  React.useEffect(() => {
    if (errorContext?.showError) {
      console.log('Setting up error handler in ApiUtil');
      apiUtil.setErrorHandler(errorContext.showError);
    } else {
      console.log('Error context not available yet');
    }
  }, [apiUtil, errorContext?.showError]);

  return <>{children}</>;
};

export const useApi = () => useContext(DataContext);
