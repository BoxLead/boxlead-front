import { Link } from "react-router-dom";
import { EmptyState } from "../../../src/components/EmptyState/EmptyState";
import { Screen } from "../components/Screen";

export function ForbiddenScreen() {
  return (
    <Screen title="Sin permiso">
      <div className="panel">
        <EmptyState
          illustration="missing"
          title="Tu rol no ve esta pantalla"
          hint="Si la necesitás, pedile a un dueño del equipo que te sume el rol."
          action={
            <Link className="btn btn-secondary" to="/">
              Ir al inicio
            </Link>
          }
        />
      </div>
    </Screen>
  );
}

export function NotFoundScreen() {
  return (
    <Screen title="No encontramos esta pantalla">
      <div className="panel">
        <EmptyState
          illustration="missing"
          title="La dirección no existe en el backoffice"
          action={
            <Link className="btn btn-secondary" to="/">
              Ir al inicio
            </Link>
          }
        />
      </div>
    </Screen>
  );
}
