import { Link } from "react-router-dom";
import { LegalLayout } from "../Legal/LegalLayout";
import { ConsumerRequestForm } from "./ConsumerRequestForm";
import { REQUEST_TITLES } from "./consumerRequest";

export function Cancellation() {
  return (
    <LegalLayout title={REQUEST_TITLES.CANCELLATION} language="es">
      <p>
        Pedí la baja de tu suscripción a BoxLead sin iniciar sesión. La baja no tiene costo y no te cobramos preaviso ni
        meses por adelantado.
      </p>
      <p>
        Dejanos el email de tu cuenta y te damos un código de pedido en el acto. Seguís usando BoxLead hasta el final del
        período que ya pagaste.
      </p>
      <p>
        Si contrataste hace menos de 10 días desde el primer cobro y querés que te devolvamos el total, usá el{" "}
        <Link to="/arrepentimiento">Botón de arrepentimiento</Link>.
      </p>
      <ConsumerRequestForm
        kind="CANCELLATION"
        submitLabel="Enviar pedido de baja"
        sentText="Dentro de las 24 horas te mandamos la constancia de baja"
      />
    </LegalLayout>
  );
}
