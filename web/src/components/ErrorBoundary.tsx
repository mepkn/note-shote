import { Component, type ReactNode } from "react";

type Props = { fallback: (error: unknown) => ReactNode; children: ReactNode };

/** Catches query errors (a deleted or foreign note) so the rest of the page keeps working. */
export class ErrorBoundary extends Component<Props, { error: unknown }> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}
