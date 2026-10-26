import { Link } from "react-router-dom";
import { SUPPORT_EMAIL } from "../../../util/company";

export function CancellationClause() {
  return (
    <ul>
      <li>
        Podés darte de baja cuando quieras, sin costo, sin preaviso y sin pagar meses por adelantado. Podés hacerlo desde
        Facturación en la app, desde el <Link to="/baja">Botón de baja de servicio</Link>, que está en la página de
        inicio y no pide iniciar sesión, o escribiendo a <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </li>
      <li>
        Al pedir la baja te damos un código de pedido en el acto. Antes de hacerla efectiva confirmamos que el pedido
        venga del email de la cuenta, y dentro de las 24 horas te mandamos por email la constancia de baja.
      </li>
      <li>
        Desde la baja no se cobran más cuotas. Seguís usando BoxLead hasta el final del período que ya pagaste.
      </li>
    </ul>
  );
}
