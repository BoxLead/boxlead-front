import "./MethodNotes.css";

type MethodNotesProps = {
  demo: boolean;
};

const NOTES: [string, string][] = [
  ["Leads nuevos", "Leads que entraron en el período, por canal y categoría."],
  [
    "Respondidos en menos de 5 min",
    "Conversaciones cuya primera respuesta, del agente o del equipo, llegó en menos de 5 minutos. Las que siguen sin respuesta cuentan en contra.",
  ],
  ["Tasa de calificación", "Leads que pasaron a calificados durante el período sobre los leads nuevos del período."],
  ["Ventas", "Leads que pasaron a cerrados durante el período, sin importar cuándo llegaron."],
  [
    "Embudo",
    "Sigue a los leads que llegaron en el período y muestra en qué etapa están hoy. Los más recientes todavía pueden avanzar.",
  ],
  ["Ingresos estimados", "Ventas por el ticket promedio que cargaste en los supuestos."],
  ["Horas ahorradas", "Respuestas del agente por los minutos que le lleva a una persona contestar un mensaje."],
  ["Fuera de horario", "Consultas que llegaron fuera del horario de atención que cargaste."],
  [
    "Estimación",
    "Tendencia de las últimas 12 semanas ajustada por día de la semana. El rango tiene 80% de confianza.",
  ],
  ["Comparaciones", "Siempre contra el período anterior de la misma duración."],
];

export function MethodNotes({ demo }: MethodNotesProps) {
  return (
    <details className="method-notes">
      <summary>Cómo calculamos estas métricas</summary>
      {demo ? (
        <p className="method-notes-demo">
          Por ahora la sección muestra datos de ejemplo para que veas cómo se va a ver con tu negocio. Respetan tus
          categorías y tus supuestos.
        </p>
      ) : null}
      <dl>
        {NOTES.map(([term, description]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{description}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
