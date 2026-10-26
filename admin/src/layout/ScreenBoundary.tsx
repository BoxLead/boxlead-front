import { Component, type ReactNode } from "react";
import { EmptyState } from "../../../src/components/EmptyState/EmptyState";

type ScreenBoundaryProps = { children: ReactNode };
type ScreenBoundaryState = { failed: boolean };

export class ScreenBoundary extends Component<ScreenBoundaryProps, ScreenBoundaryState> {
  state: ScreenBoundaryState = { failed: false };

  static getDerivedStateFromError(): ScreenBoundaryState {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="page" role="alert">
        <EmptyState
          illustration="missing"
          title="No pudimos mostrar esta pantalla"
          hint="Puede que haya una versión nueva del backoffice. Recargá la página."
          action={
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Recargar
            </button>
          }
        />
      </div>
    );
  }
}
