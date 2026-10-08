import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ReactNode } from "react";
import { reportClientError } from "@/lib/monitoring";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // This is the actual "front-end error monitoring" hook the engineering directive asks
    // for — getDerivedStateFromError alone only updates render state, it never reports
    // anything anywhere on its own.
    reportClientError(error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      // Uses this project's real design tokens (--charcoal/--limestone/--canopy) and
      // existing .button classes — the previous version referenced shadcn theme tokens
      // (bg-background, text-destructive, etc.) that are not defined anywhere in this
      // project's actual CSS, so the fallback screen itself rendered unstyled.
      return (
        <div className="flex min-h-screen items-center justify-center bg-limestone p-8">
          <div className="flex w-full max-w-2xl flex-col items-center p-8 text-center">
            <AlertTriangle size={48} className="mb-6 flex-shrink-0 text-canopy" />
            <h2 className="font-display text-2xl text-charcoal">Something went wrong.</h2>
            <p className="mt-3 text-sm leading-6 text-charcoal/65">
              We've been notified and are looking into it. Reloading the page usually resolves this.
            </p>
            {/* Stack traces are internal implementation detail (file paths, function names) —
                shown only in development, never to a real visitor in production. */}
            {import.meta.env.DEV && this.state.error?.stack && (
              <div className="mb-6 mt-6 w-full overflow-auto rounded bg-stone p-4 text-left">
                <pre className="whitespace-break-spaces text-xs text-charcoal/70">{this.state.error.stack}</pre>
              </div>
            )}
            <button onClick={() => window.location.reload()} className="button button--dark mt-8">
              <RotateCcw size={16} />
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
