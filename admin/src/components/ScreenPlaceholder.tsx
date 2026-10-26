import { EmptyState } from "../../../src/components/EmptyState/EmptyState";
import { navItem, type ScreenId } from "../nav";
import { Screen } from "./Screen";

type ScreenPlaceholderProps =
  | { screen: ScreenId }
  | { title: string; description?: string; back: { to: string; label: string } };

export function ScreenPlaceholder(props: ScreenPlaceholderProps) {
  const header =
    "screen" in props
      ? { title: navItem(props.screen).label, description: navItem(props.screen).description }
      : props;
  return (
    <Screen {...header}>
      <div className="panel">
        <EmptyState
          illustration="search"
          title="Todavía no hay nada para mostrar acá"
          hint="Esta pantalla se completa en un próximo paso del backoffice."
        />
      </div>
    </Screen>
  );
}
