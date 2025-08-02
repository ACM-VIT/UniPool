import React, { createContext, useContext, useState } from 'react';
import { StyleSheet, Animated, Easing, View } from 'react-native';
import ErrorComponent from '../components/ErrorComponent';

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
  navigationRef?: any;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children, navigationRef }) => {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
  });
  const [slideAnim] = useState(new Animated.Value(1000));

  const handleApiError = (error: any, retryAction?: () => void) => {
    console.error('API Error handled:', error);

    let showHomeButton = false;

    if (error.message === "AUTHENTICATION_REDIRECT") {
      return;
    }

    if (error.status === 404) {
      showHomeButton = true;
    }

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
  };

  const showError = (error: any, retryAction?: () => void) => {
    handleApiError(error, retryAction);
  };

  const hideError = () => {
    Animated.timing(slideAnim, {
      toValue: 1000,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => {
      setErrorState({ hasError: false });
    });
  };

  const retry = () => {
    if (errorState.retryAction) {
      hideError();
      errorState.retryAction();
    }
  };

  const goHome = () => {
    hideError();
    if (navigationRef?.current) {
      try {
        navigationRef.current.navigate('BookingScreen');
      } catch (navError) {
        console.warn('Navigation error in goHome:', navError);
      }
    } else {
      console.warn('Navigation ref not available for goHome action');
    }
  };

  const goBack = () => {
    hideError();
    if (navigationRef?.current) {
      try {
        if (navigationRef.current.canGoBack()) {
          navigationRef.current.goBack();
        } else {
          navigationRef.current.navigate('BookingScreen');
        }
      } catch (navError) {
        console.warn('Navigation error in goBack:', navError);
      }
    } else {
      console.warn('Navigation ref not available for goBack action');
    }
  };

  return (
    <ErrorContext.Provider value={{ showError, hideError }}>
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
