import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { StyleSheet, Animated, Easing, View } from 'react-native';
import { router } from "expo-router";
import ErrorComponent from '../components/ErrorComponent';
import { appHref } from "../navigation/routes";

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

interface ErrorContextType {
  showError: (error: any, retryAction?: () => void) => void;
  hideError: () => void;
}

const ErrorContext = createContext<ErrorContextType>({
  showError: () => {},
  hideError: () => {},
});

interface ErrorProviderProps {
  children: React.ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
  });
  const [slideAnim] = useState(new Animated.Value(1000));
  const lastShownErrorRef = useRef<{ key: string; shownAt: number } | null>(null);

  const handleApiError = useCallback((error: any, retryAction?: () => void) => {
    console.error('API Error handled:', error);

    let showHomeButton = false;

    if (error.message === "AUTHENTICATION_REDIRECT") {
      return;
    }

    if (error.status === 404) {
      showHomeButton = true;
    }

    const status = error.status ?? error.response?.status ?? "";
    const backendMessage =
      error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      "";
    const errorKey = `${status}:${backendMessage}`;
    const now = Date.now();
    const lastShown = lastShownErrorRef.current;
    if (
      lastShown &&
      lastShown.key === errorKey &&
      now - lastShown.shownAt < 6000
    ) {
      return;
    }
    lastShownErrorRef.current = { key: errorKey, shownAt: now };

    setErrorState({
      hasError: true,
      errorCode: error.status,
      showHomeButton,
      retryAction,
    });

    // Use a smooth timing animation for entrance instead of harsh spring
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [slideAnim]);

  const showError = useCallback((error: any, retryAction?: () => void) => {
    handleApiError(error, retryAction);
  }, [handleApiError]);

  const hideError = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 1000,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => {
      setErrorState({ hasError: false });
    });
  }, [slideAnim]);

  const retry = () => {
    if (errorState.retryAction) {
      hideError();
      errorState.retryAction();
    }
  };

  const goHome = () => {
    hideError();
    router.navigate(appHref("BookingScreen"));
  };

  const goBack = () => {
    hideError();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate(appHref("BookingScreen"));
    }
  };

  const value = useMemo(() => ({ showError, hideError }), [hideError, showError]);

  return (
    <ErrorContext.Provider value={value}>
      {children}
      {errorState.hasError && (
        <View 
          style={styles.errorOverlay}
          pointerEvents="box-none"
        >
          <ErrorComponent
            showHomeButton={errorState.showHomeButton}
            onGoHome={errorState.showHomeButton ? goHome : undefined}
            onClose={hideError}
          />
        </View>
      )}
    </ErrorContext.Provider>
  );
};

export const useErrorContext = () => useContext(ErrorContext);

const styles = StyleSheet.create({
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 15,
  },
});
