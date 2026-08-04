import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
          <AlertOctagon className="size-12 text-danger-500" aria-hidden="true" />
          <div>
            <h1 className="font-heading text-xl font-bold text-primary-900">Something went wrong</h1>
            <p className="mt-1 text-primary-500">Please refresh the page. If the problem persists, contact support.</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cursor-pointer rounded-lg bg-primary-900 px-5 py-2.5 text-sm font-semibold text-white transition-[transform] duration-150 active:scale-[0.97]"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
