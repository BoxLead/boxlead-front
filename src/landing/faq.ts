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
    question: "¿Con qué canales funciona?",
    answer: [
      "Con ",
      { to: "/whatsapp", label: "WhatsApp Business" },
      ", ",
      { to: "/instagram", label: "Instagram" },
      ", ",
      { to: "/messenger", label: "Messenger" },
      " y ",
      { to: "/mercadolibre", label: "MercadoLibre" },
      ", todos con el acceso oficial de cada plataforma y en una sola bandeja.",
    ],
  },
  {
    question: "¿Sirve para agencias y community managers?",
    answer: [
      "Sí. Podés armar un agente por cliente con la información y el tono de cada negocio. Mirá ",
      { to: "/agencias", label: "BoxLead para agencias" },
      ".",
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
