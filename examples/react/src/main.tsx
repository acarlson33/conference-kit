import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("React render error", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ color: "red", padding: 12, whiteSpace: "pre-wrap" }}>
          {this.state.error.message}\n{this.state.error.stack}
        </pre>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

try {
  createRoot(container).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} catch (error) {
  console.error("React bootstrap error", error);
  container.textContent =
    (error as Error)?.message ?? "Unknown bootstrap error";
}
