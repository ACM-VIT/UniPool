export interface ErrorComponentProps {
  title?: string;
  message?: string;
  showRetryButton?: boolean;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  onRetry?: () => void;
  onGoHome?: () => void;
  onGoback?: () => void;
  animationSize?: "small" | "medium" | "large";
  customAnimation?: any;
}

export default ErrorComponentProps;
