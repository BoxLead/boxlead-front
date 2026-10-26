import { Link } from "react-router-dom";
import { LegalLayout } from "../Legal/LegalLayout";
import { ConsumerRequestForm } from "./ConsumerRequestForm";
import { REQUEST_TITLES } from "./consumerRequest";

export function Withdrawal() {
  return (
    <LegalLayout title={REQUEST_TITLES.WITHDRAWAL} language="es">
      <p>
        Si contrataste un plan pago de BoxLead podés arrepentirte dentro de los 10 días corridos desde el primer cobro. Te
        devolvemos el total aunque ya hayas usado BoxLead y arrepentirte no te cuesta nada.
      </p>
      <p>
        No hace falta iniciar sesión. Dejanos el email de tu cuenta y te damos un código de pedido en el acto. La
        devolución se hace por Mercado Pago, que es quien procesó el cobro.
      </p>
      <p>
        Si solo querés dejar de pagar, usá el <Link to="/baja">Botón de baja de servicio</Link>.
      </p>
      <ConsumerRequestForm
        kind="WITHDRAWAL"
        submitLabel="Enviar pedido de arrepentimiento"
        sentText="Dentro de las 24 horas te escribimos para confirmar el pedido y la devolución"
      />
    </LegalLayout>
  );
}
