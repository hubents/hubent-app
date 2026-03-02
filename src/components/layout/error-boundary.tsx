"use client";

import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RiAlertLine, RiRefreshLine } from "@remixicon/react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[50vh] items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <RiAlertLine className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Algo salió mal</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Ocurrió un error inesperado. Intenta recargar la página.
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              <RiRefreshLine className="mr-2 h-4 w-4" />
              Recargar página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
