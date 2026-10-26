import { MERCADO_PAGO_TERMS_URL } from "../legalVersion";

export function MercadoPagoClause() {
  return (
    <ul>
      <li>
        Los pagos los procesa Mercado Pago, un servicio de un tercero independiente de Catvin SRL. Al pagar se aplican
        además los{" "}
        <a href={MERCADO_PAGO_TERMS_URL} target="_blank" rel="noopener noreferrer">
          términos y condiciones de Mercado Pago
        </a>
        .
      </li>
      <li>
        Catvin SRL no ve ni guarda los datos de tu tarjeta ni de tu medio de pago. Los cargás directamente en Mercado Pago.
      </li>
      <li>No cobramos ningún recargo por pagar con Mercado Pago.</li>
      <li>
        Catvin SRL no responde por los actos propios de Mercado Pago, como demoras en acreditar o devolver un pago o fallas
        de su plataforma, en la medida en que la ley lo permita. Esto no limita los derechos que te reconoce la Ley 24.240
        de Defensa del Consumidor ni te impide reclamarnos a nosotros.
      </li>
      <li>Si un cobro falla te avisamos por email antes de suspender el servicio.</li>
    </ul>
  );
}
