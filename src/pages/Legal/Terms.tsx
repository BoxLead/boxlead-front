import { Link } from "react-router-dom";
import { ProviderDetails } from "../../components/ProviderDetails/ProviderDetails";
import { LEGAL_ENTITY_NAME, SUPPORT_EMAIL } from "../../util/company";
import { CancellationClause } from "./clauses/CancellationClause";
import { MercadoPagoClause } from "./clauses/MercadoPagoClause";
import { PriceClause } from "./clauses/PriceClause";
import { WithdrawalClause } from "./clauses/WithdrawalClause";
import { LegalLayout } from "./LegalLayout";
import { LEGAL_VERSION_LABEL } from "./legalVersion";

export function Terms() {
  return (
    <LegalLayout title="Términos y condiciones" language="es" meta={LEGAL_VERSION_LABEL}>
      <p>
        Estos términos regulan el uso de BoxLead, el servicio que presta {LEGAL_ENTITY_NAME}. Esta versión en castellano
        es la que aceptás y la que prevalece sobre cualquier traducción.
      </p>

      <h2>1. Quién presta el servicio</h2>
      <p>BoxLead es una marca de {LEGAL_ENTITY_NAME}. Estos son sus datos.</p>
      <ProviderDetails className="legal-provider" />

      <h2>2. Qué es BoxLead</h2>
      <p>
        BoxLead es un servicio en línea que reúne en una sola bandeja las conversaciones de los canales que conectás, como
        WhatsApp, Instagram, Messenger y MercadoLibre, ordena tus leads y te deja configurar agentes de inteligencia
        artificial que responden y califican por vos. Las características y los límites de cada plan se muestran en la
        app antes de contratar.
      </p>

      <h2>3. Cómo aceptás estos términos</h2>
      <ul>
        <li>
          Los aceptás de forma expresa marcando la casilla al crear tu cuenta, al contratar un plan pago o cuando
          publicamos una versión nueva. Seguir usando BoxLead no cuenta como aceptación.
        </li>
        <li>
          Cada aceptación queda registrada con la versión, la fecha y la hora, y te mandamos una copia por email.
        </li>
        <li>Podés leer, guardar e imprimir esta versión desde esta página cuando quieras.</li>
      </ul>

      <h2>4. Tu cuenta</h2>
      <ul>
        <li>
          Tenés que ser mayor de 18 años y poder contratar. Si contratás para una empresa, declarás que podés obligarla.
        </li>
        <li>Tus datos tienen que ser verdaderos y estar al día. Podés corregirlos desde la app antes de pagar.</li>
        <li>Cuidá tu contraseña. Sos responsable de lo que se haga con tu cuenta.</li>
      </ul>

      <h2>5. Planes y precios</h2>
      <p>
        BoxLead tiene una Beta gratuita por invitación, por el plazo que indica la invitación, y planes pagos de
        suscripción mensual. El plan Enterprise se acuerda por separado.
      </p>
      <PriceClause />

      <h2>6. Pagos con Mercado Pago</h2>
      <MercadoPagoClause />

      <h2>7. Falta de pago</h2>
      <ul>
        <li>
          Si una cuota no se cobra, Mercado Pago la reintenta. Durante un período de gracia BoxLead sigue funcionando y
          te avisamos para que actualices el medio de pago.
        </li>
        <li>
          Si el pago no se regulariza, suspendemos los agentes y la bandeja queda en solo lectura. Si sigue sin pagarse,
          cancelamos la suscripción. Los plazos de cada etapa se informan en la app y en los avisos.
        </li>
        <li>La suspensión no borra tus datos.</li>
      </ul>

      <h2>8. Cambios de plan</h2>
      <ul>
        <li>
          Si pasás a un plan superior, el cambio rige en el acto y el monto nuevo se cobra desde la cuota siguiente, sin
          prorrateo.
        </li>
        <li>Si pasás a un plan inferior, el cambio rige al terminar el período que ya pagaste.</li>
      </ul>

      <h2>9. Baja</h2>
      <CancellationClause />

      <h2>10. Arrepentimiento</h2>
      <WithdrawalClause />

      <h2>11. Uso aceptable</h2>
      <p>Al usar BoxLead te comprometés a no</p>
      <ul>
        <li>
          mandar spam, mensajes no solicitados o contenido que viole las reglas de WhatsApp, Meta o MercadoLibre
        </li>
        <li>acosar, amenazar o engañar a otras personas</li>
        <li>intentar entrar a cuentas, datos o sistemas ajenos</li>
        <li>usar BoxLead para algo que viole la ley</li>
        <li>copiar, descompilar o intentar extraer el código de BoxLead</li>
      </ul>

      <h2>12. Canales de terceros</h2>
      <ul>
        <li>
          BoxLead se conecta con WhatsApp, Instagram, Messenger y MercadoLibre a través de sus servicios oficiales. Cada
          canal se rige además por las reglas de su dueño.
        </li>
        <li>
          Si un canal cambia sus reglas, revoca el acceso o deja de funcionar, la función que depende de él puede
          limitarse. Te avisamos apenas lo sepamos.
        </li>
      </ul>

      <h2>13. Agentes de inteligencia artificial</h2>
      <ul>
        <li>
          Los agentes escriben respuestas con modelos de inteligencia artificial a partir de la información y las
          instrucciones que cargás. Pueden equivocarse.
        </li>
        <li>
          Vos decidís qué agentes activar, con qué instrucciones y en qué canales, y podés revisar, pausar o pasar a
          borrador sus respuestas cuando quieras.
        </li>
        <li>Sos responsable de la información de tu negocio que cargás, como precios, stock y condiciones de venta.</li>
        <li>
          Cada plan incluye una cantidad de respuestas de agentes por período. Al llegar al límite los agentes pasan a
          borrador y la bandeja sigue funcionando.
        </li>
      </ul>

      <h2>14. Datos de tus clientes</h2>
      <ul>
        <li>
          Las conversaciones y los datos de tus clientes que llegan por los canales conectados son tuyos. Sobre esos datos
          vos sos el responsable y {LEGAL_ENTITY_NAME} los trata por tu cuenta.
        </li>
        <li>
          {LEGAL_ENTITY_NAME} los usa solo para prestarte BoxLead, no los cede a terceros salvo a los proveedores que
          necesita para el servicio y que figuran en la <Link to="/privacidad">Política de privacidad</Link>, los protege
          con medidas de seguridad y los borra cuando termina la relación, como explica esa política.
        </li>
        <li>
          Sos responsable de tener una base legal para tratar los datos de tus clientes y de informarles que usás BoxLead.
        </li>
      </ul>

      <h2>15. Propiedad intelectual</h2>
      <p>
        BoxLead, su diseño, su código y su marca son de {LEGAL_ENTITY_NAME}. Vos conservás todos los derechos sobre los
        datos que cargás y los mensajes que mandás.
      </p>

      <h2>16. Disponibilidad y responsabilidad</h2>
      <ul>
        <li>
          Trabajamos para que BoxLead esté disponible siempre, pero puede haber interrupciones por mantenimiento, fallas o
          servicios de terceros. Si una interrupción planificada afecta el servicio te avisamos antes.
        </li>
        <li>
          {LEGAL_ENTITY_NAME} responde por los daños que cause según la ley aplicable. Nada en estos términos limita los
          derechos que te reconoce la Ley 24.240 de Defensa del Consumidor ni las normas que no se pueden dejar de lado por
          contrato.
        </li>
      </ul>

      <h2>17. Suspensión por incumplimiento</h2>
      <p>
        Podemos suspender tu cuenta si la usás en contra de estos términos o de la ley, o si lo ordena una autoridad. Salvo
        urgencia, te avisamos antes y te damos la oportunidad de corregirlo.
      </p>

      <h2>18. Cambios en estos términos</h2>
      <p>
        Si cambiamos estos términos te avisamos por email y en la app antes de que rijan. La versión nueva solo te alcanza
        si la aceptás de forma expresa. Si no la aceptás podés darte de baja sin costo.
      </p>

      <h2>19. Ley aplicable y reclamos</h2>
      <ul>
        <li>
          Estos términos se rigen por las leyes de la República Argentina. Si sos consumidor, son competentes los
          tribunales de tu domicilio y cualquier pacto en contrario no tiene efecto.
        </li>
        <li>
          Podés hacer reclamos a <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> o ante la autoridad de defensa
          del consumidor de tu jurisdicción.
        </li>
        <li>
          El modelo de contrato está publicado en{" "}
          <Link to="/contratos">Contratos de adhesión Ley N° 24.240 de Defensa del Consumidor</Link>.
        </li>
      </ul>

      <h2>20. Idioma</h2>
      <p>
        Estos términos se redactan en castellano. La <Link to="/terms-of-service">traducción al inglés</Link> es solo de
        referencia y, si hay diferencias, prevalece el castellano.
      </p>

      <div className="legal-contact">
        <p>
          <strong>{LEGAL_ENTITY_NAME}</strong>. Consultas y reclamos a{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      </div>
    </LegalLayout>
  );
}
