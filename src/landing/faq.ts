export type FaqLink = { to: string; label: string };

export type FaqPart = string | FaqLink;

export type Faq = { question: string; answer: FaqPart[] };

export const LANDING_FAQS: Faq[] = [
  {
    question: "¿El agente responde solo?",
    answer: ["Sí. Y vos elegís cuánto delegar: puede responder en automático o dejarte un borrador para aprobar."],
  },
  {
    question: "¿Qué pasa con mis datos?",
    answer: [
      "Los usamos solo para prestarte el servicio y no los vendemos. Mirá la ",
      { to: "/privacidad", label: "Política de privacidad" },
      " o pedí la ",
      { to: "/data-deletion", label: "eliminación de tus datos" },
      " cuando quieras.",
    ],
  },
  {
    question: "¿Cómo se paga?",
    answer: ["Con una suscripción mensual que incluye todos tus canales."],
  },
];

export function faqText(parts: FaqPart[]): string {
  return parts.map((part) => (typeof part === "string" ? part : part.label)).join("");
}
