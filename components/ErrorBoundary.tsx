"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Composant de fallback personnalisé */
  fallback?: ReactNode;
  /** Callback appelé quand une erreur est capturée */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Afficher les détails de l'erreur (dev only) */
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Composant ErrorBoundary pour capturer les erreurs React
 * et afficher une interface de récupération
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // Avec fallback personnalisé
 * <ErrorBoundary fallback={<CustomErrorPage />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Logger l'erreur
    logger.error("ErrorBoundary caught an error", error, {
      module: "ErrorBoundary",
      data: {
        componentStack: errorInfo.componentStack,
      },
    });

    this.setState({ errorInfo });

    // Appeler le callback si fourni
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = "/dashboard";
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails } = this.props;

    if (!hasError) {
      return children;
    }

    // Utiliser le fallback personnalisé si fourni
    if (fallback) {
      return fallback;
    }

    const isDev = process.env.NODE_ENV === "development";
    const shouldShowDetails = showDetails ?? isDev;

    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl">Une erreur est survenue</CardTitle>
            <CardDescription>
              Nous sommes désolés, quelque chose s&apos;est mal passé. Veuillez
              réessayer ou retourner à l&apos;accueil.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {shouldShowDetails && error && (
              <div className="rounded-lg bg-muted p-4">
                <p className="mb-2 font-mono text-sm font-semibold text-red-600">
                  {error.name}: {error.message}
                </p>
                {errorInfo?.componentStack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                      Voir la stack trace
                    </summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              onClick={this.handleReset}
              className="w-full sm:w-auto"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
            <Button
              variant="outline"
              onClick={this.handleReload}
              className="w-full sm:w-auto"
            >
              Recharger la page
            </Button>
            <Button onClick={this.handleGoHome} className="w-full sm:w-auto">
              <Home className="mr-2 h-4 w-4" />
              Accueil
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
}

/**
 * HOC pour wrapper un composant avec ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
  const WithErrorBoundaryComponent = (props: P) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };

  WithErrorBoundaryComponent.displayName = `WithErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return WithErrorBoundaryComponent;
}

/**
 * Composant d'erreur simplifié pour les pages
 */
export function PageError({
  title = "Erreur",
  message = "Une erreur est survenue lors du chargement de cette page.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="mb-4 h-12 w-12 text-amber-500" />
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <p className="mb-4 max-w-md text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
      )}
    </div>
  );
}
