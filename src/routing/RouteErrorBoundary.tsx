import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { RouteError } from "./RouteError";

type Props = { children: ReactNode; resetKey: string; inline?: boolean };
type State = { error: unknown };

class Boundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (import.meta.env.DEV) console.error(error, info.componentStack);
  }

  componentDidUpdate(previous: Props): void {
    if (previous.resetKey !== this.props.resetKey && this.state.error !== null) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <RouteError error={this.state.error} inline={this.props.inline} onRetry={() => this.setState({ error: null })} />
      );
    }
    return this.props.children;
  }
}

export function RouteErrorBoundary({ children, inline = false }: { children: ReactNode; inline?: boolean }) {
  const location = useLocation();
  return (
    <Boundary resetKey={`${location.pathname}${location.search}`} inline={inline}>
      {children}
    </Boundary>
  );
}
