import type { PlatformType } from "../api/types";
import type { Faq } from "./faq";

export type EditorialSlug = "whatsapp" | "instagram" | "messenger" | "mercadolibre" | "agencias";

export type Capability = { title: string; description: string };

export type EditorialStep = { title: string; description: string };

export type EditorialPageData = {
  slug: EditorialSlug;
  path: string;
  platform: PlatformType | null;
  label: string;
  title: string;
  description: string;
  heading: string;
  lead: string;
  capabilitiesHeading: string;
  capabilities: Capability[];
  stepsHeading: string;
  steps: EditorialStep[];
  faqs: Faq[];
  related: EditorialSlug[];
};

export const EDITORIAL_PAGES: EditorialPageData[] = [
  {
    slug: "whatsapp",
    path: "/whatsapp",
    platform: "WHATSAPP",
    label: "WhatsApp Business",
    title: "Agente de IA para WhatsApp Business",
    description:
      "Un agente de IA que responde tu WhatsApp Business las 24 horas, califica cada lead y respeta la ventana de 24 horas con plantillas aprobadas. Para pymes de Argentina y Latinoamérica.",
    heading: "Un agente de IA que atiende tu WhatsApp Business las 24 horas",
    lead:
      "Las consultas por WhatsApp llegan a cualquier hora y el que responde primero suele vender. BoxLead conecta tu número con la API oficial de Meta y pone un agente a responder cada chat.",
    capabilitiesHeading: "Lo que BoxLead hace con tu WhatsApp",
    capabilities: [
      {
        title: "Tu número, en una sola bandeja",
        description: "Los chats de tu número de WhatsApp Business llegan a BoxLead junto con tus otros canales, y cada respuesta sale desde ese mismo número.",
      },
      {
        title: "Ventana de 24 horas y plantillas",
        description: "Pasadas 24 horas del último mensaje de la persona, BoxLead te ofrece tus plantillas aprobadas para seguir la conversación.",
      },
      {
        title: "Conexión oficial de Meta",
        description: "Conectás con el inicio de sesión de Facebook y el registro integrado de WhatsApp Business. Sin números virtuales ni apps de terceros en tu teléfono.",
      },
    ],
    stepsHeading: "Cómo se conecta",
    steps: [
      { title: "Iniciá sesión con Facebook", description: "Elegís tu número de WhatsApp Business desde el registro integrado de Meta." },
      { title: "Los chats llegan a la bandeja", description: "Cada mensaje que recibe ese número aparece en BoxLead con su contacto." },
      { title: "Configurá tu agente", description: "Le contás qué vendés y cómo atendés, y elegís si responde solo o deja borradores." },
    ],
    faqs: [
      {
        question: "¿Necesito la API de WhatsApp Business?",
        answer: ["BoxLead usa la API oficial de WhatsApp Business de Meta. La conexión se hace desde BoxLead con tu cuenta de Facebook y tu número, sin trámites técnicos de tu lado."],
      },
      {
        question: "¿Qué pasa después de las 24 horas?",
        answer: ["WhatsApp cierra el texto libre 24 horas después del último mensaje de la persona. BoxLead te lo avisa y te deja elegir una de tus plantillas aprobadas para responder."],
      },
      {
        question: "¿Funciona con Instagram y MercadoLibre a la vez?",
        answer: ["Sí. La misma bandeja reúne WhatsApp, ", { to: "/instagram", label: "Instagram" }, ", ", { to: "/messenger", label: "Messenger" }, " y ", { to: "/mercadolibre", label: "MercadoLibre" }, ", y el mismo agente puede atender todos."],
      },
    ],
    related: ["instagram", "mercadolibre", "messenger"],
  },
  {
    slug: "instagram",
    path: "/instagram",
    platform: "INSTAGRAM",
    label: "Instagram",
    title: "Responder mensajes y comentarios de Instagram con IA",
    description:
      "Un agente de IA que responde los mensajes directos y los comentarios de tus publicaciones y reels de Instagram, reúne cada persona en una conversación y califica tus leads.",
    heading: "Mensajes directos y comentarios de Instagram, respondidos por tu agente",
    lead:
      "Las consultas en Instagram llegan por privado y en los comentarios. BoxLead las junta en una conversación por persona y pone un agente a responder con la información de tu negocio.",
    capabilitiesHeading: "Lo que BoxLead hace con tu Instagram",
    capabilities: [
      {
        title: "Mensajes directos y comentarios juntos",
        description: "Los mensajes directos y los comentarios en publicaciones y reels llegan a la conversación de cada persona, con el enlace a la publicación.",
      },
      {
        title: "Respuesta pública o privada",
        description: "Respondés el comentario en público o por mensaje directo desde la misma pantalla. Si el privado ya se cerró, sale como respuesta privada a su último comentario.",
      },
      {
        title: "Acceso oficial de Meta",
        description: "Autorizás a BoxLead desde tu cuenta profesional de Instagram con el acceso oficial de Meta.",
      },
    ],
    stepsHeading: "Cómo se conecta",
    steps: [
      { title: "Autorizá tu cuenta profesional", description: "Desde BoxLead, con el acceso oficial de Instagram." },
      { title: "Todo llega a una conversación", description: "Mensajes directos y comentarios, por persona y con su historial." },
      { title: "Configurá tu agente", description: "Le cargás productos, precios y tono, y elegís cuánto delegar." },
    ],
    faqs: [
      {
        question: "¿Responde los comentarios o solo los mensajes directos?",
        answer: ["Los dos. Los comentarios en publicaciones y reels aparecen dentro de la conversación de la persona y se pueden responder en público, y los mensajes directos se responden por privado."],
      },
      {
        question: "¿Hace falta una cuenta profesional?",
        answer: ["Sí. Instagram solo permite conectar cuentas profesionales, de empresa o de creador, con el acceso oficial de Meta."],
      },
      {
        question: "¿Qué pasa si la persona no me escribió por privado?",
        answer: ["Podés responderle en público en su comentario. Si Instagram ya no acepta mensajes directos para esa persona, BoxLead manda la respuesta como respuesta privada a su último comentario."],
      },
    ],
    related: ["whatsapp", "messenger", "mercadolibre"],
  },
  {
    slug: "messenger",
    path: "/messenger",
    platform: "META",
    label: "Messenger",
    title: "Agente de IA para Messenger y tu página de Facebook",
    description:
      "Un agente de IA que atiende los mensajes que recibe tu página de Facebook por Messenger, responde en nombre de la página y deja cada lead ordenado en tu bandeja.",
    heading: "Los mensajes de tu página de Facebook, atendidos en automático",
    lead:
      "Cada mensaje que llega a tu página por Messenger es una consulta que espera. BoxLead los trae a tu bandeja y pone un agente a responder en nombre de la página.",
    capabilitiesHeading: "Lo que BoxLead hace con tu página",
    capabilities: [
      {
        title: "Los mensajes de la página en tu bandeja",
        description: "Los mensajes que recibe tu página llegan a BoxLead como leads, y las respuestas salen en nombre de la página.",
      },
      {
        title: "Ventana de 24 horas",
        description: "Messenger deja responder dentro de las 24 horas del último mensaje de la persona. BoxLead te avisa cuando esa ventana se cerró.",
      },
      {
        title: "Varias páginas, una bandeja",
        description: "Podés conectar más de una página y verlas junto a WhatsApp, Instagram y MercadoLibre.",
      },
    ],
    stepsHeading: "Cómo se conecta",
    steps: [
      { title: "Iniciá sesión con Facebook", description: "Elegís la página que querés conectar." },
      { title: "Los mensajes llegan a la bandeja", description: "Cada conversación de la página aparece con su historial." },
      { title: "Configurá tu agente", description: "Le contás qué vendés y cómo atendés, y elegís cuánto delegar." },
    ],
    faqs: [
      {
        question: "¿Sirve para la página de mi negocio en Facebook?",
        answer: ["Sí. BoxLead se conecta a páginas de Facebook y atiende los mensajes que reciben por Messenger."],
      },
      {
        question: "¿Puedo conectar la página y el Instagram del mismo negocio?",
        answer: ["Sí. Cada canal se conecta por separado y todos caen en la misma bandeja. Mirá cómo funciona con ", { to: "/instagram", label: "Instagram" }, "."],
      },
      {
        question: "¿Qué pasa si pasaron más de 24 horas?",
        answer: ["Messenger solo deja responder dentro de las 24 horas del último mensaje de la persona. Vas a poder escribirle cuando vuelva a escribir a tu página."],
      },
    ],
    related: ["whatsapp", "instagram", "mercadolibre"],
  },
  {
    slug: "mercadolibre",
    path: "/mercadolibre",
    platform: "MELI",
    label: "MercadoLibre",
    title: "Responder preguntas de MercadoLibre automáticamente con IA",
    description:
      "Un agente de IA que responde las preguntas de tus publicaciones de MercadoLibre y los mensajes de postventa de cada venta, con la información de tu negocio y en minutos.",
    heading: "Preguntas y postventa de MercadoLibre con respuesta inmediata",
    lead:
      "En MercadoLibre la pregunta sin responder es una venta que se va a otra publicación. BoxLead trae las preguntas y los mensajes de tus ventas a una bandeja y pone un agente a contestarlos.",
    capabilitiesHeading: "Lo que BoxLead hace con tu cuenta de MercadoLibre",
    capabilities: [
      {
        title: "Preguntas de tus publicaciones",
        description: "Cada pregunta nueva llega a la bandeja con la publicación a la que pertenece y la respuesta se publica en MercadoLibre.",
      },
      {
        title: "Postventa con el contexto de la compra",
        description: "Los mensajes de cada venta llegan con el estado de la compra, y los datos de contacto del comprador quedan en el lead.",
      },
      {
        title: "Dentro de las reglas de MercadoLibre",
        description: "Una respuesta por pregunta, hasta 2000 caracteres, y mensajes de postventa de hasta 350. BoxLead te avisa antes de que algo no se pueda enviar.",
      },
    ],
    stepsHeading: "Cómo se conecta",
    steps: [
      { title: "Autorizá tu cuenta de vendedor", description: "Desde BoxLead, con el acceso oficial de MercadoLibre." },
      { title: "Preguntas y ventas en la bandeja", description: "Cada pregunta y cada mensaje de postventa aparece con su contexto." },
      { title: "Configurá tu agente", description: "Le cargás tu catálogo, tus condiciones de envío y de pago, y elegís cuánto delegar." },
    ],
    faqs: [
      {
        question: "¿Responde solo las preguntas o también la postventa?",
        answer: ["Las dos cosas. Las preguntas de tus publicaciones y los mensajes de cada venta llegan a la misma bandeja y el agente puede atender ambas etapas."],
      },
      {
        question: "¿Puedo revisar antes de que se publique la respuesta?",
        answer: ["Sí. Podés dejar el agente en modo borrador y aprobar cada respuesta antes de que salga a MercadoLibre."],
      },
      {
        question: "¿Qué pasa si la pregunta ya fue respondida?",
        answer: ["MercadoLibre permite una sola respuesta por pregunta. BoxLead responde la pregunta pendiente más antigua y te avisa cuando no queda ninguna abierta."],
      },
    ],
    related: ["whatsapp", "instagram", "messenger"],
  },
  {
    slug: "agencias",
    path: "/agencias",
    platform: null,
    label: "Agencias y community managers",
    title: "BoxLead para agencias y community managers",
    description:
      "Sumá un agente de IA a cada cliente que atendés. Conectá sus canales de WhatsApp, Instagram, Messenger y MercadoLibre, configurá el tono y mostrá resultados sin sumar horas de atención.",
    heading: "Sumá un agente de IA a cada cliente que atendés",
    lead:
      "Las consultas de tus clientes no esperan a tu horario. BoxLead te deja armar un agente por cliente que responde con la información de ese negocio.",
    capabilitiesHeading: "Lo que BoxLead le da a tu agencia",
    capabilities: [
      {
        title: "Una cuenta por cliente",
        description: "Cada negocio tiene su propia bandeja, sus canales conectados y sus agentes, con la información y el tono de ese cliente.",
      },
      {
        title: "Configuración sin código",
        description: "Cargás productos, precios, preguntas frecuentes y tono en un formulario, y elegís si cada agente responde solo o deja borradores.",
      },
      {
        title: "Los cuatro canales que usan tus clientes",
        description: "WhatsApp Business, Instagram, Messenger y MercadoLibre con los accesos oficiales de cada plataforma.",
      },
    ],
    stepsHeading: "Cómo trabajás con BoxLead",
    steps: [
      { title: "Conectás los canales del cliente", description: "Con sus propias cuentas y los accesos oficiales de Meta y MercadoLibre." },
      { title: "Armás el agente", description: "Nombre, instrucciones, tono y la información del negocio." },
      { title: "Mostrás resultados", description: "La página de métricas resume qué se respondió, en cuánto tiempo y qué leads quedaron calificados." },
    ],
    faqs: [
      {
        question: "¿Tienen un programa para agencias?",
        answer: ["Sí. Escribinos a ", { to: "mailto:support@boxlead.app", label: "support@boxlead.app" }, " y te contamos cómo trabajar con BoxLead para varios clientes."],
      },
      {
        question: "¿El cliente ve la bandeja o solo yo?",
        answer: ["Cada cuenta es del negocio. Quien tenga acceso a esa cuenta ve su bandeja, sus leads y sus métricas, y podés trabajar junto con tu cliente."],
      },
      {
        question: "¿Puedo revisar lo que responde el agente?",
        answer: ["Sí. Cada agente puede trabajar en automático o dejar borradores para que una persona apruebe antes de enviar."],
      },
    ],
    related: ["whatsapp", "instagram", "mercadolibre"],
  },
];

export function editorialPage(pathname: string): EditorialPageData | null {
  return EDITORIAL_PAGES.find((page) => page.path === pathname) ?? null;
}
