import { MercadoLibreMark } from "../components/icons/PlatformIcons";
import { emailAndPhone, lengthError, reconnectError } from "./shared";
import type { PlatformDefinition, PlatformErrorView } from "./types";

export const MELI_ANSWER_LIMIT = 2000;
export const MELI_MESSAGE_LIMIT = 350;

function upstreamDetail(message: string): string | null {
  const start = message.indexOf("{");
  if (start === -1) return null;
  try {
    const body: unknown = JSON.parse(message.slice(start));
    if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
      return body.message;
    }
  } catch {
    return null;
  }
  return null;
}

function explainError(status: number, message: string): PlatformErrorView | null {
  const reconnect = reconnectError("MercadoLibre", message);
  if (reconnect) return reconnect;
  if (status === 409 && /none unanswered/i.test(message)) {
    return {
      title: "No hay preguntas pendientes",
      detail: "MercadoLibre solo permite responder preguntas abiertas y este comprador ya tiene todas respondidas.",
      action: null,
    };
  }
  if (status === 409 && /has no MELI user id/i.test(message)) {
    return {
      title: "No pudimos identificar al comprador",
      detail: "Este contacto no tiene un usuario de MercadoLibre asociado, así que no se le puede responder desde BoxLead.",
      action: null,
    };
  }
  if (status === 409 && /no order\/pack/i.test(message)) {
    return {
      title: "Todavía no hay una venta asociada",
      detail: "Vas a poder responder cuando llegue el próximo mensaje del comprador sobre su compra.",
      action: null,
    };
  }
  if (status === 400 && /limited to 2000/i.test(message)) return lengthError(MELI_ANSWER_LIMIT);
  if (status === 400 && /limited to 350/i.test(message)) return lengthError(MELI_MESSAGE_LIMIT);
  if (status === 400 && /cannot be empty/i.test(message)) {
    return { title: "Escribí un mensaje antes de enviar", detail: null, action: null };
  }
  if (status === 502 && /HTTP 403/i.test(message)) {
    return {
      title: "MercadoLibre bloqueó el envío",
      detail: upstreamDetail(message) ?? "La conversación puede estar cerrada o con un reclamo abierto.",
      action: null,
    };
  }
  if (status === 502) {
    return {
      title: "MercadoLibre rechazó el mensaje",
      detail: upstreamDetail(message) ?? "Probá de nuevo en unos minutos.",
      action: "retry",
    };
  }
  return null;
}

export const meli: PlatformDefinition = {
  id: "MELI",
  name: "MercadoLibre",
  accountNoun: "cuenta de vendedor",
  summary: "Respondé las preguntas de tus publicaciones y los mensajes de tus ventas desde BoxLead.",
  syncs: [
    "Preguntas de tus publicaciones",
    "Mensajes de postventa",
    "Datos de contacto de cada compra",
  ],
  connect: "redirect",
  stageLabels: { PRE_SALE: "Preguntas", POST_SALE: "Postventa" },
  reply: (stage) =>
    stage === "POST_SALE"
      ? {
          kind: "chat",
          maxLength: MELI_MESSAGE_LIMIT,
          placeholder: "Escribí un mensaje al comprador",
          hint: "MercadoLibre limita los mensajes de postventa a 350 caracteres.",
        }
      : {
          kind: "questions",
          maxLength: MELI_ANSWER_LIMIT,
          placeholder: "Escribí tu respuesta",
          hint: "Se publica en la publicación como respuesta a la pregunta pendiente más antigua.",
        },
  explainError,
  contactFields: emailAndPhone,
  logo: (size) => <MercadoLibreMark width={size} height={size} aria-hidden="true" />,
};
