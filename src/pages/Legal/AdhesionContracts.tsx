import { Link } from "react-router-dom";
import { ProviderDetails } from "../../components/ProviderDetails/ProviderDetails";
import { LEGAL_ENTITY_NAME, SUPPORT_EMAIL } from "../../util/company";
import { CancellationClause } from "./clauses/CancellationClause";
import { MercadoPagoClause } from "./clauses/MercadoPagoClause";
import { PriceClause } from "./clauses/PriceClause";
import { WithdrawalClause } from "./clauses/WithdrawalClause";
import { LegalLayout } from "./LegalLayout";
import { LEGAL_VERSION_LABEL } from "./legalVersion";

const ADHESION_CONTRACTS_TITLE = "Contratos de adhesión Ley N° 24.240 de Defensa del Consumidor";

export function AdhesionContracts() {
  return (
    <LegalLayout title={ADHESION_CONTRACTS_TITLE} language="es" meta={LEGAL_VERSION_LABEL}>
      <p>
        Este es el modelo de contrato de adhesión que usa {LEGAL_ENTITY_NAME} para la suscripción a BoxLead, publicado
        según el artículo 38 de la Ley 24.240. El texto vigente es este y está completo en este sitio.
      </p>

      <h2>Contrato de suscripción a BoxLead</h2>

      <h3>1. Partes</h3>
      <p>
        El contrato se celebra entre {LEGAL_ENTITY_NAME}, el proveedor, y la persona o empresa que contrata un plan de
        BoxLead, el cliente.
      </p>
      <ProviderDetails className="legal-provider" />

      <h3>2. Objeto</h3>
      <p>
        {LEGAL_ENTITY_NAME} presta al cliente el servicio en línea BoxLead en el plan que elige. Las características y los
        límites de cada plan se muestran en la app antes de contratar y forman parte de este contrato.
      </p>

      <h3>3. Precio y renovación</h3>
      <PriceClause />

      <h3>4. Forma de pago</h3>
      <MercadoPagoClause />

      <h3>5. Cambios de plan</h3>
      <p>
        Un cambio a un plan superior rige en el acto y el monto nuevo se cobra desde la cuota siguiente, sin prorrateo. Un
        cambio a un plan inferior rige al terminar el período ya pagado.
      </p>

      <h3>6. Baja</h3>
      <CancellationClause />

      <h3>7. Revocación o arrepentimiento</h3>
      <WithdrawalClause />

      <h3>8. Datos personales</h3>
      <p>
        Los datos se tratan según la <Link to="/privacidad">Política de privacidad</Link>, que integra este contrato.
      </p>

      <h3>9. Condiciones generales</h3>
      <p>
        Integran este contrato los <Link to="/terminos">Términos y condiciones</Link> y la Política de privacidad
        publicados en este sitio, en la versión que el cliente acepta al contratar. Se aceptan de forma expresa y el
        cliente recibe una copia por email.
      </p>

      <h3>10. Ley aplicable y jurisdicción</h3>
      <p>
        Rigen las leyes de la República Argentina. Si el cliente es consumidor, son competentes los tribunales de su
        domicilio. Los reclamos se pueden hacer a <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> o ante la
        autoridad de defensa del consumidor de su jurisdicción.
      </p>

      <h2>Promociones vigentes</h2>
      <p>
        No hay promociones vigentes. Cuando haya una la publicamos en esta página con sus condiciones y sus fechas de
        inicio y fin.
      </p>
    </LegalLayout>
  );
}
