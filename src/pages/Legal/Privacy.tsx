import { Link } from "react-router-dom";
import { ProviderDetails } from "../../components/ProviderDetails/ProviderDetails";
import { LEGAL_ENTITY_NAME, SUPPORT_EMAIL } from "../../util/company";
import { LegalLayout } from "./LegalLayout";
import { LEGAL_VERSION_LABEL } from "./legalVersion";

const AAIP_URL = "https://www.argentina.gob.ar/aaip";

export function Privacy() {
  return (
    <LegalLayout title="Política de privacidad" language="es" meta={LEGAL_VERSION_LABEL}>
      <p>
        Esta política explica qué datos personales trata {LEGAL_ENTITY_NAME} cuando usás BoxLead, para qué, con quién los
        comparte y cómo ejercer tus derechos según la Ley 25.326 de Protección de los Datos Personales. Esta versión en
        castellano es la que aceptás y la que prevalece sobre cualquier traducción.
      </p>

      <h2>1. Responsable</h2>
      <p>El responsable de tus datos es {LEGAL_ENTITY_NAME}.</p>
      <ProviderDetails className="legal-provider" />

      <h2>2. Qué datos tratamos</h2>
      <ul>
        <li>
          <strong>Cuenta.</strong> Nombre, email y contraseña guardada en forma cifrada. Si entrás con Google o Facebook,
          el identificador y el email que nos pasa ese servicio.
        </li>
        <li>
          <strong>Facturación.</strong> Razón social, CUIT, condición frente al IVA, domicilio fiscal y email de
          facturación.
        </li>
        <li>
          <strong>Pagos.</strong> Plan, montos, fechas, estado de cada cobro y el email de tu cuenta de Mercado Pago. No
          vemos ni guardamos los datos de tu tarjeta.
        </li>
        <li>
          <strong>Canales conectados.</strong> Identificadores y permisos de acceso de tus cuentas de WhatsApp, Instagram,
          Messenger y MercadoLibre.
        </li>
        <li>
          <strong>Conversaciones y leads.</strong> Los mensajes que entran y salen por esos canales y los datos de contacto
          de tus clientes. Sobre estos datos sos el responsable y nosotros los tratamos por tu cuenta, como dice el punto
          8.
        </li>
        <li>
          <strong>Uso.</strong> Respuestas de los agentes, actividad en la app y métricas del servicio.
        </li>
        <li>
          <strong>Aceptaciones y pedidos.</strong> La versión de cada documento que aceptás, con fecha, hora, dirección IP
          y navegador, y los pedidos de baja o arrepentimiento con el email, el detalle y la dirección IP.
        </li>
        <li>
          <strong>Referidos.</strong> Si llegaste por el link de un revendedor, el código de ese link.
        </li>
      </ul>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Crear tu cuenta y prestarte BoxLead.</li>
        <li>Cobrarte, facturarte y cumplir las obligaciones fiscales.</li>
        <li>Mostrarte, ordenar y responder las conversaciones de tus canales, también con agentes de IA.</li>
        <li>Registrar tus aceptaciones y atender tus pedidos de baja, arrepentimiento y consultas.</li>
        <li>Calcular la comisión del revendedor que te refirió, si existe.</li>
        <li>Cuidar la seguridad del servicio y evitar abusos.</li>
      </ul>
      <p>
        Usamos tus datos porque son necesarios para el contrato que tenés con nosotros o porque lo exige la ley. No los
        vendemos ni los usamos para publicidad de terceros.
      </p>

      <h2>4. Qué datos son obligatorios</h2>
      <p>
        Los datos de cuenta y de facturación son necesarios para prestarte el servicio y facturarte. Si no los das, no
        podemos crear la cuenta o cobrar el plan. El detalle de los pedidos de baja y arrepentimiento es optativo.
      </p>

      <h2>5. Con quién los compartimos</h2>
      <ul>
        <li>
          <strong>Amazon Web Services</strong>, que aloja BoxLead, guarda los datos, manda los emails y ejecuta los
          modelos de IA de los agentes.
        </li>
        <li>
          <strong>Auth0</strong>, que gestiona el ingreso con Google o Facebook.
        </li>
        <li>
          <strong>Meta</strong> y <strong>MercadoLibre</strong>, para recibir y mandar los mensajes de los canales que
          conectás.
        </li>
        <li>
          <strong>Mercado Pago</strong>, que procesa los pagos.
        </li>
        <li>
          <strong>TypeSafe AI</strong>, que clasifica conversaciones a partir de fragmentos cortos, sin emails, teléfonos
          ni links.
        </li>
        <li>
          <strong>Cloudflare</strong>, que protege y entrega el sitio.
        </li>
        <li>
          <strong>El revendedor que te refirió</strong>, si existe, que solo ve tu razón social o tu email enmascarado y
          el estado de tu suscripción.
        </li>
        <li>
          <strong>Autoridades</strong>, cuando lo exige la ley o una orden válida.
        </li>
      </ul>
      <p>Los proveedores usan los datos solo para prestarnos su servicio y según nuestras instrucciones.</p>

      <h2>6. Transferencias fuera de la Argentina</h2>
      <p>
        Algunos de esos proveedores guardan o procesan datos en Estados Unidos, que la Agencia de Acceso a la Información
        Pública no considera un país con protección adecuada. Esas transferencias se hacen con las cláusulas contractuales
        modelo aprobadas por la Agencia.
      </p>

      <h2>7. Cuánto tiempo los guardamos</h2>
      <ul>
        <li>Mientras tu cuenta esté activa.</li>
        <li>
          Si cerrás tu cuenta o pedís que borremos tus datos, borramos leads, conversaciones y mensajes dentro de los 30
          días.
        </li>
        <li>
          Los datos de facturación y pagos y el registro de aceptaciones se guardan durante los plazos que exigen las
          normas fiscales y de defensa del consumidor.
        </li>
      </ul>

      <h2>8. Datos de tus clientes</h2>
      <p>
        Sobre los datos de tus clientes que llegan por los canales conectados, vos sos el responsable y {LEGAL_ENTITY_NAME}{" "}
        los trata por tu cuenta. Los usamos solo para prestarte BoxLead, no los cedemos ni los usamos para otros fines, y
        los borramos cuando termina la relación. Sos responsable de informarles a tus clientes que usás BoxLead.
      </p>

      <h2>9. Tus derechos</h2>
      <ul>
        <li>
          Podés pedir acceso a tus datos en forma gratuita cada seis meses, o antes si acreditás un interés legítimo. Te
          respondemos dentro de los 10 días corridos.
        </li>
        <li>
          Podés pedir que los corrijamos, actualicemos o borremos. Lo hacemos dentro de los 5 días hábiles.
        </li>
        <li>
          Escribinos desde el email de tu cuenta a <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Para tus
          clientes, que nos escriban a vos.
        </li>
      </ul>
      <p className="legal-aaip">
        El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
        gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo
        establecido en el artículo 14, inciso 3 de la Ley Nº 25.326. La{" "}
        <a href={AAIP_URL} target="_blank" rel="noopener noreferrer">
          AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA
        </a>
        , en su carácter de Órgano de Control de la Ley Nº 25.326, tiene la atribución de atender las denuncias y reclamos
        que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de
        protección de datos personales.
      </p>

      <h2>10. Registro de bases de datos</h2>
      <p>
        {LEGAL_ENTITY_NAME} inscribe sus bases de datos en el Registro Nacional de Bases de Datos de la Agencia de Acceso
        a la Información Pública.
      </p>

      <h2>11. Cookies y almacenamiento</h2>
      <ul>
        <li>Una cookie de sesión, que no se puede leer desde el navegador, para mantenerte conectado.</li>
        <li>Una cookie con el código del revendedor, si llegaste por su link.</li>
        <li>Una cookie con la invitación a la Beta, que dura una hora.</li>
        <li>El tema claro u oscuro que elegís, guardado en tu navegador.</li>
      </ul>
      <p>
        No usamos cookies de publicidad. Si conectás WhatsApp, el ingreso con Meta puede dejar sus propias cookies.
      </p>

      <h2>12. Seguridad</h2>
      <p>
        Usamos conexiones cifradas, guardamos los permisos de acceso de forma segura y limitamos quién puede ver los
        datos.
      </p>

      <h2>13. Menores</h2>
      <p>BoxLead es para mayores de 18 años y no tratamos a sabiendas datos de menores.</p>

      <h2>14. Cambios en esta política</h2>
      <p>
        Si cambiamos esta política te avisamos por email y en la app antes de que rija. La versión nueva solo te alcanza si
        la aceptás de forma expresa.
      </p>

      <h2>15. Idioma</h2>
      <p>
        La <Link to="/privacy-policy">traducción al inglés</Link> es solo de referencia y, si hay diferencias, prevalece el
        castellano.
      </p>

      <div className="legal-contact">
        <p>
          <strong>{LEGAL_ENTITY_NAME}</strong>. Consultas sobre tus datos a{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      </div>
    </LegalLayout>
  );
}
