import { Link } from "react-router-dom";
import { SUPPORT_EMAIL } from "../../../util/company";

export function WithdrawalClause() {
  return (
    <ul>
      <li>
        Tenés derecho a revocar la contratación de un plan pago dentro de los 10 días corridos contados desde el primer
        cobro, sin dar motivos y sin ningún costo. Este derecho es irrenunciable.
      </li>
      <li>Te devolvemos el total cobrado aunque ya hayas usado BoxLead.</li>
      <li>
        Podés ejercerlo desde el <Link to="/arrepentimiento">Botón de arrepentimiento</Link>, que está en la página de
        inicio y no pide iniciar sesión, o escribiendo a <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Te
        damos un código de pedido en el acto y dentro de las 24 horas te confirmamos el pedido por email.
      </li>
      <li>
        La devolución se hace por Mercado Pago al mismo medio con el que pagaste y la suscripción se cancela. El plazo de
        acreditación depende de Mercado Pago y del emisor de tu medio de pago.
      </li>
    </ul>
  );
}
