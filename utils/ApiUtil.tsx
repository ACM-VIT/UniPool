import { getAuth, getIdTokenResult } from "@react-native-firebase/auth";
import React, { createContext, use, useCallback, useMemo, useState } from "react";
import baseURL from "../config/urlconfig";
import { useErrorContext } from '../contexts/ErrorContext';
import {
  cachePolicyForEndpoint,
  getFreshCache,
  getInflight,
  getStaleCache,
  invalidateAllDynamicApiCache,
  invalidateApiCacheForMutation,
  makeApiCacheKey,
  setInflight,
  writeCache,
} from "./ApiCache";

const DEBUG_API =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_DEBUG_API === "1";

type JSON = {
  [key: string]: string | number | boolean | JSON;
};

type RequestOptions = {
  bypassCache?: boolean;
  allowStaleOnFailure?: boolean;
  showGlobalError?: boolean;
};

export default class ApiUtil {
  private baseUrl: string;
  private showError?: (error: any, retryAction?: () => void) => void;
  private isAppInitialized: boolean = true;
  private authTokenCache: { uid: string; token: string; expiresAtMs: number } | null = null;
  private authTokenInflight: { uid: string; promise: Promise<string | null> } | null = null;
  private authStateResolved: boolean = false;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setErrorHandler(showError: (error: any, retryAction?: () => void) => void) {
    this.showError = showError;
  }

  private createAuthenticationError(message = "AUTHENTICATION_REDIRECT", response?: any): Error {
    const error: any = new Error(message);
    error.status = response?.status ?? 401;
    if (response) error.response = response;
    return error;
  }

  async get<T>(endpoint: string, headers?: HeadersInit, timeout?: number): Promise<T> {
    const retryAction = () => this.get<T>(endpoint, headers, timeout);
    return this.makeRequestWithErrorHandling<T>("GET", endpoint, undefined, headers, timeout, retryAction);
  }

  /**
   * GET variant for probes that are expected to fail (e.g. trying /ride/preview
   * before falling back to /external/preview). Still throws, but attaches no
   * global error/retry sheet, so a routine 404/400 doesn't flash a toast.
   */
  async getSilent<T>(endpoint: string, headers?: HeadersInit, timeout?: number): Promise<T> {
    return this.makeRequestWithErrorHandling<T>("GET", endpoint, undefined, headers, timeout);
  }

  async getUncached<T>(endpoint: string, headers?: HeadersInit, timeout?: number): Promise<T> {
    const retryAction = () => this.getUncached<T>(endpoint, headers, timeout);
    return this.makeRequestWithErrorHandling<T>(
      "GET",
      endpoint,
      undefined,
      headers,
      timeout,
      retryAction,
      undefined,
      { bypassCache: true, allowStaleOnFailure: false },
    );
  }

  async getForUser<T>(endpoint: string, firebaseUser: any, headers?: HeadersInit, timeout?: number): Promise<T> {
    const retryAction = () => this.getForUser<T>(endpoint, firebaseUser, headers, timeout);
    return this.makeRequestWithErrorHandling<T>("GET", endpoint, undefined, headers, timeout, retryAction, firebaseUser);
  }

  async getForUserUncached<T>(endpoint: string, firebaseUser: any, headers?: HeadersInit, timeout?: number): Promise<T> {
    const retryAction = () => this.getForUserUncached<T>(endpoint, firebaseUser, headers, timeout);
    return this.makeRequestWithErrorHandling<T>(
      "GET",
      endpoint,
      undefined,
      headers,
      timeout,
      retryAction,
      firebaseUser,
      { bypassCache: true, allowStaleOnFailure: false },
    );
  }

  async post<T, B>(endpoint: string, body: B, headers?: HeadersInit, timeout?: number): Promise<T> {
    const retryAction = () => this.post<T, B>(endpoint, body, headers, timeout);
    return this.makeRequestWithErrorHandling<T>("POST", endpoint, body, headers, timeout, retryAction);
  }

  /**
   * POST variant for best-effort side effects such as read receipts.
   * It still throws, but it does not attach a global retry sheet.
   */
  async postSilent<T, B>(endpoint: string, body: B, headers?: HeadersInit, timeout?: number): Promise<T> {
    return this.makeRequestWithErrorHandling<T>("POST", endpoint, body, headers, timeout);
  }

  async put<T, B>(endpoint: string, body: B, headers?: HeadersInit, timeout?: number): Promise<T> {
    const retryAction = () => this.put<T, B>(endpoint, body, headers, timeout);
    return this.makeRequestWithErrorHandling<T>("PUT", endpoint, body, headers, timeout, retryAction);
  }

  /**
   * PUT variant for optimistic flows that handle errors locally.
   */
  async putSilent<T, B>(endpoint: string, body: B, headers?: HeadersInit, timeout?: number): Promise<T> {
    return this.makeRequestWithErrorHandling<T>("PUT", endpoint, body, headers, timeout);
  }

  async patch<T, B>(endpoint: string, body: B, headers?: HeadersInit, timeout?: number): Promise<T> {
    const retryAction = () => this.patch<T, B>(endpoint, body, headers, timeout);
    return this.makeRequestWithErrorHandling<T>("PATCH", endpoint, body, headers, timeout, retryAction);
  }

  /**
   * DELETE variant for optimistic flows that handle errors locally.
   */
  async deleteSilent<T>(endpoint: string, headers?: HeadersInit, timeout?: number): Promise<T> {
    return this.makeRequestWithErrorHandling<T>("DELETE", endpoint, undefined, headers, timeout);
  }

  async delete<T>(endpoint: string, headers?: HeadersInit, timeout?: number): Promise<T> {
    const retryAction = () => this.delete<T>(endpoint, headers, timeout);
    return this.makeRequestWithErrorHandling<T>("DELETE", endpoint, undefined, headers, timeout, retryAction);
  }

  getCurrentUserId(): string | null {
    return getAuth().currentUser?.uid ?? null;
  }

  invalidateCache() {
    invalidateAllDynamicApiCache(this.getCurrentUserId());
  }

  clearAuthTokenCache() {
    this.authTokenCache = null;
    this.authTokenInflight = null;
  }

  primeAuthToken(uid: string, token: string, expiresAtMs: number) {
    if (!uid || !token || !Number.isFinite(expiresAtMs)) return;
    this.authTokenCache = { uid, token, expiresAtMs };
  }

  setAuthStateResolved(resolved: boolean) {
    this.authStateResolved = resolved;
  }

  private async resolveFirebaseUser(firebaseUser?: any): Promise<any | null> {
    const authInstance = getAuth();
    let currentUser = firebaseUser ?? authInstance.currentUser;
    if (!currentUser && this.authStateResolved) {
      return null;
    }
    if (!currentUser) {
      for (let i = 0; i < 10 && !currentUser; i++) {
        await new Promise((r) => setTimeout(r, 50));
        currentUser = firebaseUser ?? authInstance.currentUser;
        if (!currentUser && this.authStateResolved) {
          return null;
        }
      }
    }
    return currentUser ?? null;
  }

  async getAuthToken(firebaseUser?: any): Promise<string | null> {
    const currentUser = await this.resolveFirebaseUser(firebaseUser);
    if (!currentUser) return null;

    const uid = currentUser.uid;
    const nowMs = Date.now();
    const refreshWindowMs = 5 * 60_000;
    const cachedToken = this.authTokenCache;
    if (cachedToken !== null && cachedToken.uid === uid && cachedToken.expiresAtMs - nowMs > refreshWindowMs) {
      return cachedToken.token;
    }

    const inflight = this.authTokenInflight;
    if (inflight !== null && inflight.uid === uid) {
      return inflight.promise;
    }

    const forceRefresh =
      cachedToken !== null &&
      cachedToken.uid === uid &&
      cachedToken.expiresAtMs - nowMs <= refreshWindowMs;

    const promise = (async () => {
      let tokenResult = await getIdTokenResult(currentUser, forceRefresh);
      let expiresAtMs = Date.parse(tokenResult.expirationTime);

      if (!forceRefresh && Number.isFinite(expiresAtMs) && expiresAtMs - Date.now() <= refreshWindowMs) {
        if (DEBUG_API) console.log("Token expires soon, forcing refresh...");
        tokenResult = await getIdTokenResult(currentUser, true);
        expiresAtMs = Date.parse(tokenResult.expirationTime);
      }

      if (!Number.isFinite(expiresAtMs)) {
        expiresAtMs = Date.now() + 50 * 60_000;
      }

      this.authTokenCache = {
        uid,
        token: tokenResult.token,
        expiresAtMs,
      };

      return tokenResult.token;
    })().finally(() => {
      if (this.authTokenInflight?.uid === uid) {
        this.authTokenInflight = null;
      }
    });

    this.authTokenInflight = { uid, promise };
    return promise;
  }

  private shouldUseStaleFallback(error: any) {
    const status = error?.response?.status ?? error?.status;
    if (typeof status === "number") {
      return status === 408 || status === 429 || status >= 500;
    }

    const message = String(error?.message ?? "");
    return (
      message.includes("Timeout") ||
      message.includes("Network request failed") ||
      message.includes("Failed to fetch") ||
      message.includes("Network error")
    );
  }

  private shouldShowGlobalErrorFor(error: any, method: string, requestOptions: RequestOptions) {
    if (requestOptions.showGlobalError === true) {
      return true;
    }

    if (requestOptions.showGlobalError === false || method === "GET") {
      return false;
    }

    const status = error?.response?.status ?? error?.status;
    if (typeof status === "number") {
      return status === 408 || status === 429 || status >= 500;
    }

    return this.shouldUseStaleFallback(error);
  }

  private async makeRequestWithErrorHandling<T>(
    method: string,
    endpoint: string,
    body?: any,
    headers: HeadersInit = {},
    timeout: number = 20000,
    retryAction?: () => Promise<T>,
    firebaseUser?: any,
    requestOptions: RequestOptions = {},
  ): Promise<T> {
    const userId = firebaseUser?.uid ?? this.getCurrentUserId();
    const cachePolicy = method === "GET" ? cachePolicyForEndpoint(endpoint) : null;
    // Coalesce identical in-flight GETs even when callers bypass stored cache.
    const requestKey =
      method === "GET"
        ? makeApiCacheKey(endpoint, userId, headers)
        : null;
    const cacheKey =
      cachePolicy?.enabled
        ? requestKey
        : null;
    const canReadCache = Boolean(cacheKey && cachePolicy?.enabled && !requestOptions.bypassCache);
    const canWriteCache = Boolean(cacheKey && cachePolicy?.enabled);
    const allowStaleOnFailure = requestOptions.allowStaleOnFailure !== false;

    if (canReadCache && cacheKey && cachePolicy) {
      const fresh = getFreshCache<T>(cacheKey);
      if (fresh !== undefined) {
        return fresh;
      }

      const stale = getStaleCache<T>(cacheKey);
      if (stale !== undefined) {
        const existing = getInflight<T>(cacheKey);
        if (!existing) {
          const refresh = this.makeRequest<T>(method, endpoint, body, headers, timeout, firebaseUser)
            .then((response) => {
              writeCache(cacheKey, endpoint, userId, response, cachePolicy);
              return response;
            })
            .catch((error) => {
              console.warn(`Background refresh failed for ${endpoint}`, error);
              return stale;
            });
          setInflight(cacheKey, refresh);
        }
        return stale;
      }

      const existing = getInflight<T>(cacheKey);
      if (existing) {
        try {
          return await existing;
        } catch (error) {
          const stale = getStaleCache<T>(cacheKey);
          if (allowStaleOnFailure && this.shouldUseStaleFallback(error) && stale !== undefined) {
            return stale;
          }
          throw error;
        }
      }
    }

    if (requestKey) {
      const existing = getInflight<T>(requestKey);
      if (existing) {
        try {
          return await existing;
        } catch (error) {
          const stale = cacheKey ? getStaleCache<T>(cacheKey) : undefined;
          if (allowStaleOnFailure && cacheKey && this.shouldUseStaleFallback(error) && stale !== undefined) {
            return stale;
          }
          throw error;
        }
      }
    }

    try {
      const networkRequest = this.makeRequest<T>(method, endpoint, body, headers, timeout, firebaseUser);
      if (requestKey) {
        setInflight(requestKey, networkRequest);
      }
      const response = await networkRequest;
      if (canWriteCache && cacheKey && cachePolicy) {
        writeCache(cacheKey, endpoint, userId, response, cachePolicy);
      } else if (method !== "GET") {
        invalidateApiCacheForMutation(endpoint, userId);
      }
      return response;
    } catch (error: any) {
      if (allowStaleOnFailure && canReadCache && cacheKey && this.shouldUseStaleFallback(error)) {
        const stale = getStaleCache<T>(cacheKey);
        if (stale !== undefined) {
          console.warn(`Using stale cache for ${endpoint} after request failure`);
          return stale;
        }
      }

      if (DEBUG_API) console.log('Error caught in makeRequestWithErrorHandling:', error);
      
      if (error instanceof Error && error.message === "AUTHENTICATION_REDIRECT") {
        throw error;
      }
      
      if (error?.response?.status === 401) {
        this.clearAuthTokenCache();
        if (DEBUG_API) console.log('Authentication error (401) - caller needs to decide how to recover');
        throw this.createAuthenticationError("AUTHENTICATION_REDIRECT", error.response);
      }
      
      if (error?.response?.status === 403) {
        if (DEBUG_API) console.log('Authorization error (403) - user lacks permission but is authenticated');
        throw error;
      }
      
      if (error?.message?.includes('Unauthorized') || 
          error?.message?.includes('JSON Parse error: Unexpected character: U')) {
        this.clearAuthTokenCache();
        if (DEBUG_API) console.log('Unauthorized response detected - surfacing auth error to caller');
        throw this.createAuthenticationError();
      }
      
      // Callers own domain-specific 404 recovery such as profile completion.
      
      // Reserve the global sheet for failures that indicate an unhealthy
      // app/backend path rather than expected domain responses.
      const shouldShowGlobalError = this.shouldShowGlobalErrorFor(error, method, requestOptions);

      if (this.showError && retryAction && this.isAppInitialized && shouldShowGlobalError &&
          error?.response?.status !== 401 && 
          error?.response?.status !== 403 &&
          error?.response?.status !== 404 &&
          !error?.message?.includes('AUTHENTICATION_REDIRECT')) {
        if (DEBUG_API) console.log('Showing error modal for:', error);
        this.showError(error, retryAction);
        throw error;
      } else {
        if (DEBUG_API) console.log('No error handler needed - auth error, signup redirect, or app not initialized yet');
      }
      
      throw error;
    }
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    body?: any,
    headers: HeadersInit = {},
    timeout: number = 20000,
    firebaseUser?: any
  ): Promise<T> {
    const url = new URL(endpoint, this.baseUrl).toString();
    if (DEBUG_API) console.log(`Making ${method} request to: ${url}`);

    // Guests call public endpoints without Authorization; gated routes return
    // 401 and flow through the normal auth recovery below.
    let token: string | null = null;
    try {
      token = await this.getAuthToken(firebaseUser);
    } catch (tokenError) {
      console.error("Failed to get authentication token:", tokenError);
      throw this.createAuthenticationError();
    }

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      const responseText = await response.text();
      
      try {
        if (!responseText.trim()) {
          if (response.ok) {
            if (DEBUG_API) console.log(`${method} ${url} returned an empty successful response`);
            return {} as T;
          }
          throw new Error("Empty response");
        }
        
        if (responseText.trim() === 'Unauthorized') {
          if (DEBUG_API) console.log("Detected unauthorized text response");
          responseBody = { error: responseText.trim() };
        } else if (responseText.trim() === 'Forbidden') {
          if (DEBUG_API) console.log("Detected forbidden text response");
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
          if (DEBUG_API) console.log(`${method} ${url} had an empty successful response - treating as success`);
          return {} as T;
        }
        
        if (responseText.trim() === 'Unauthorized') {
          if (DEBUG_API) console.log("Unauthorized response detected during JSON parse error");
          responseBody = { error: responseText.trim() };
        } else if (responseText.trim() === 'Forbidden') {
          if (DEBUG_API) console.log("Forbidden response detected during JSON parse error");
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
          this.clearAuthTokenCache();
          console.warn("User authentication failed (401)");
          const error: any = new Error(`HTTP ${response.status}`);
          error.status = response.status;
          error.response = { status: response.status, data: responseBody };
          throw error;
        }
        if (response.status === 403) {
          console.warn("User authorization failed (403) - user lacks permission but is authenticated");
        }
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

  const triggerRevalidation = useCallback(() => {
    apiUtil.invalidateCache();
    setRevalidate(true);
    setTimeout(() => setRevalidate(false), 10);
  }, [apiUtil]);

  const value = useMemo(
    () => ({ apiUtil, revalidate, triggerRevalidation }),
    [apiUtil, revalidate, triggerRevalidation],
  );

  return (
    <DataContext.Provider value={value}>
      <ApiErrorHandler apiUtil={apiUtil}>
        {children}
      </ApiErrorHandler>
    </DataContext.Provider>
  );
};

const ApiErrorHandler: React.FC<{ children: React.ReactNode; apiUtil: ApiUtil }> = ({ children, apiUtil }) => {
  const errorContext = useErrorContext();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (errorContext?.showError) {
        if (DEBUG_API) console.log('Setting up error handler in ApiUtil (delayed)');
        apiUtil.setErrorHandler(errorContext.showError);
      } else {
        if (DEBUG_API) console.log('Error context not available yet');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [apiUtil, errorContext?.showError]);

  return <>{children}</>;
};

export const useApi = () => use(DataContext);
