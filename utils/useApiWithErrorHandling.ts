import { useCallback } from 'react';
import { useApi } from './ApiUtil';
import { useErrorContext } from '../contexts/ErrorContext';

export const useApiWithErrorHandling = () => {
  const { apiUtil } = useApi();
  const { showError } = useErrorContext();

  const safeApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    retryAction?: () => void
  ): Promise<T | null> => {
    try {
      return await apiCall();
    } catch (error) {
      if (error instanceof Error && error.message === "AUTHENTICATION_REDIRECT") {
        throw error;
      }
      
      showError(error, retryAction);
      return null;
    }
  }, [showError]);

  const get = useCallback(<T>(endpoint: string, headers?: HeadersInit, timeout?: number): Promise<T | null> => {
    const apiCall = () => apiUtil.get<T>(endpoint, headers, timeout);
    const retryAction = (): Promise<T | null> => get<T>(endpoint, headers, timeout);
    return safeApiCall(apiCall, retryAction);
  }, [apiUtil, safeApiCall]);

  const post = useCallback(<T, B>(endpoint: string, body: B, headers?: HeadersInit, timeout?: number): Promise<T | null> => {
    const apiCall = () => apiUtil.post<T, B>(endpoint, body, headers, timeout);
    const retryAction = (): Promise<T | null> => post<T, B>(endpoint, body, headers, timeout);
    return safeApiCall(apiCall, retryAction);
  }, [apiUtil, safeApiCall]);

  const put = useCallback(<T, B>(endpoint: string, body: B, headers?: HeadersInit, timeout?: number): Promise<T | null> => {
    const apiCall = () => apiUtil.put<T, B>(endpoint, body, headers, timeout);
    const retryAction = (): Promise<T | null> => put<T, B>(endpoint, body, headers, timeout);
    return safeApiCall(apiCall, retryAction);
  }, [apiUtil, safeApiCall]);

  const del = useCallback(<T>(endpoint: string, headers?: HeadersInit, timeout?: number): Promise<T | null> => {
    const apiCall = () => apiUtil.delete<T>(endpoint, headers, timeout);
    const retryAction = (): Promise<T | null> => del<T>(endpoint, headers, timeout);
    return safeApiCall(apiCall, retryAction);
  }, [apiUtil, safeApiCall]);

  return {
    get,
    post,
    put,
    delete: del,
    getCurrentUserId: apiUtil.getCurrentUserId.bind(apiUtil),
    safeApiCall,
  };
};
