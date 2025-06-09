import { firebase } from "@react-native-firebase/auth";
import React, { createContext, useContext, useState } from "react";
import baseURL from "../config/urlconfig";

type JSON = {
  [key: string]: string | number | boolean | JSON;
};

export default class ApiUtil {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
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

    const token = (await firebase.auth().currentUser?.getIdTokenResult())?.token;
    if (!token) throw new Error("User not authenticated");

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
      try {
        responseBody = await response.clone().json();
      } catch {
        responseBody = await response.clone().text();
      }

      if (!response.ok) {
        console.error(`HTTP ${method} ${url} error ${response.status}:`, responseBody);
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(responseBody)}`);
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
  const apiUtil = new ApiUtil(baseURL);

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
