// A render error in React unmounts the whole tree and leaves a blank page. That
// is the worst possible failure: the user sees nothing, cannot tell whether they
// are signed out or the app is broken, and reporting it means reading a console
// they may not have open. So one boundary catches it, shows what happened, and
// offers the two actions that actually help: reload, or start again at login.
//
// It deliberately does NOT export crashes to a third-party service. None is
// configured (see docs/STORE-READINESS.md), and inventing one would be a
// privacy claim the product cannot keep.
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

// Kept outside React state: StrictMode double-invokes render, and the buffer is
// read after a crash, when state no longer matters.
const recent: string[] = [];

function remember(line: string) {
  recent.push(line);
  if (recent.length > 5) recent.shift();
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Console is the only sink. A real deployment attaches a tracker here and
    // forwards the same payload.
    remember(`${new Date().toISOString()} ${error.message}`);
    console.error("[twoplus] render error", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="splash" role="alert">
        <div className="crash">
          <h1>Something broke on this screen</h1>
          <p>
            Your data is not lost: everything you saved is already in the
            database. Reloading usually clears it.
          </p>
          {/* The message only. A stack trace helps nobody holding a phone. */}
          <code className="crash-detail">{error.message}</code>
          <div className="crash-actions">
            <button type="button" className="btn" onClick={() => location.reload()}>
              Reload
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                // Back to a known-good route rather than the crash's own URL,
                // which would re-render the same broken screen.
                location.assign("/login");
              }}
            >
              Go to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// Exposed for the crash screen's own diagnostics if a future version shows them.
export function recentErrors(): string[] {
  return [...recent];
}
