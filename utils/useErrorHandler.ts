import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

export interface ErrorState {
  hasError: boolean;
  title?: string;
  message?: string;
  errorCode?: string | number;
  showRetryButton?: boolean;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  retryAction?: () => void;
}

export const useErrorHandler = () => {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
  });
  
  let navigation: any = null;
  try {
    navigation = useNavigation();
  } catch (error) {
    console.warn('Navigation not available in ErrorHandler context');
  }

  const handleApiError = useCallback((error: any, retryAction?: () => void) => {
    console.error('API Error handled:', error);

    let title = "Oops! Something went wrong";
    let message = "We're having trouble loading this page. Please try again.";
    let showRetryButton = true;
    let showHomeButton = false;
    let showBackButton = true;

    if (error.message === "AUTHENTICATION_REDIRECT") {
      return;
    }

    if (error.message?.includes("Network")) {
      title = "No Internet Connection";
      message = "Please check your internet connection and try again.";
    } else if (error.message?.includes("Timeout")) {
      title = "Request Timed Out";
      message = "The request is taking too long. Please try again.";
    } else if (error.status === 404) {
      title = "Page Not Found";
      message = "The page you're looking for doesn't exist.";
      showHomeButton = true;
    } else if (error.status === 500) {
      title = "Server Error";
      message = "Our servers are having trouble. Please try again later.";
    } else if (error.status >= 400 && error.status < 500) {
      title = "Request Error";
      message = error.response?.data?.message || "There was a problem with your request.";
    }

    setErrorState({
      hasError: true,
      title,
      message,
      errorCode: error.status,
      showRetryButton,
      showHomeButton,
      showBackButton,
      retryAction,
    });
  }, []);

  const clearError = useCallback(() => {
    setErrorState({ hasError: false });
  }, []);

  const retry = useCallback(() => {
    if (errorState.retryAction) {
      clearError();
      errorState.retryAction();
    }
  }, [errorState.retryAction, clearError]);

  const goHome = useCallback(() => {
    clearError();
    if (navigation) {
      (navigation as any).navigate('BookingScreen');
    } else {
      console.warn('Navigation not available for goHome action');
    }
  }, [navigation, clearError]);

  const goBack = useCallback(() => {
    clearError();
    if (navigation) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        (navigation as any).navigate('BookingScreen');
      }
    } else {
      console.warn('Navigation not available for goBack action');
    }
  }, [navigation, clearError]);

  return {
    errorState,
    handleApiError,
    clearError,
    retry,
    goHome,
    goBack,
  };
};
