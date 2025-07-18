import { getAuth, getIdTokenResult, signOut } from "@react-native-firebase/auth";
import React, { createContext, useContext, useState } from "react";
import baseURL from "../config/urlconfig";
import { CommonActions } from '@react-navigation/native';

type JSON = {
  [key: string]: string | number | boolean | JSON;
};

export default class ApiUtil {
  private baseUrl: string;
  private navigationRef?: any;

  constructor(baseUrl: string, navigationRef?: any) {
    this.baseUrl = baseUrl;
    this.navigationRef = navigationRef;
  }

  setNavigationRef(navigationRef: any) {
    this.navigationRef = navigationRef;
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
    return this.makeRequest<T>("GET", endpoint, undefined, headers, timeout);
  }

  async post<T, B>(endpoint: string, body: B, headers?: HeadersInit, timeout?: number): Promise<T> {
    return this.makeRequest<T>("POST", endpoint, body, headers, timeout);
  }

  async put<T, B>(endpoint: string, body: B, headers?: HeadersInit, timeout?: number): Promise<T> {
    return this.makeRequest<T>("PUT", endpoint, body, headers, timeout);
  }

  async delete<T>(endpoint: string, headers?: HeadersInit, timeout?: number): Promise<T> {
    return this.makeRequest<T>("DELETE", endpoint, undefined, headers, timeout);
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
        
        const errorMessage = typeof responseBody === 'object' && responseBody.error 
          ? String(responseBody.error)
          : `HTTP ${response.status}`;
          
        throw new Error(errorMessage);
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
      {children}
    </DataContext.Provider>
  );
};

export const useApi = () => useContext(DataContext);
