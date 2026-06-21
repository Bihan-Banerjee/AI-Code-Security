import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean }

/** Catches render-time errors so a single broken component can't blank the whole app. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-background px-4">
          <div className="glass-strong max-w-md rounded-2xl p-8 text-center">
            <h1 className="font-display text-2xl font-bold text-gradient">Something went wrong</h1>
            <p className="mt-2 text-muted-foreground">An unexpected error occurred. Try reloading the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-gradient-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
