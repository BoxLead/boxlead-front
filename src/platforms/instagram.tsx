import { InstagramIcon } from "../components/icons/PlatformIcons";
import { emailAndPhone, lengthError, reconnectError } from "./shared";
import type { PlatformDefinition } from "./types";

export const INSTAGRAM_TEXT_LIMIT = 1000;
export const INSTAGRAM_COMMENT_LIMIT = 2200;
const USERNAME = /^[a-z0-9._]{1,30}$/i;

const POST_LABELS: Record<string, string> = {
  FEED: "una publicación",
  REELS: "un reel",
  STORY: "una historia",
  AD: "un anuncio",
  IGTV: "un video",
};

export const instagram: PlatformDefinition = {
  id: "INSTAGRAM",
  name: "Instagram",
  accountNoun: "cuenta profesional",
  addAnother: "Agregar otra cuenta",
  summary: "Respondé mensajes directos y comentarios de tus publicaciones y reels desde la misma conversación.",
  syncs: ["Mensajes directos", "Comentarios en publicaciones y reels"],
  howItWorks: [
    "Autorizás a BoxLead desde tu cuenta profesional de Instagram.",
    "Los mensajes directos y los comentarios llegan a la conversación de cada persona.",
    "Respondés por mensaje directo o, en cada comentario, en público.",
  ],
  connect: "redirect",
  stageLabels: { PRE_SALE: "Mensajes" },
  reply: () => ({
    kind: "chat",
    maxLength: INSTAGRAM_TEXT_LIMIT,
    placeholder: "Escribí un mensaje directo",
    hint: "Si Instagram ya no acepta mensajes directos, se envía como respuesta privada a su último comentario (una sola vez).",
  }),
  commentReply: {
    maxLength: INSTAGRAM_COMMENT_LIMIT,
    placeholder: "Escribí tu respuesta pública",
    postLabel: (productType) => (productType && POST_LABELS[productType.toUpperCase()]) || "una publicación",
  },
  explainError: (status, message) => {
    const reconnect = reconnectError("Instagram", message);
    if (reconnect) return reconnect;
    if (status === 400 && /limited to/i.test(message)) {
      return lengthError(/comments are limited/i.test(message) ? INSTAGRAM_COMMENT_LIMIT : INSTAGRAM_TEXT_LIMIT);
    }
    if (status === 409 && /reply window/i.test(message)) {
      return {
        title: "Ya no podés escribirle por privado",
        detail:
          "Instagram ya no acepta mensajes directos a esta persona y no queda un comentario reciente para responderle en privado. Podés responder el comentario en público.",
        action: null,
      };
    }
    return null;
  },
  contactFields: (lead) => {
    const username = lead.name?.trim();
    const profile = username && USERNAME.test(username)
      ? [{ label: "Perfil", value: `@${username}`, href: `https://www.instagram.com/${username}/` }]
      : [];
    return [...profile, ...emailAndPhone(lead)];
  },
  hasContext: true,
  contextStatus: () => null,
  externalIdIsContact: false,
  canStartConversation: true,
  colorClass: "platform-color-instagram",
  logo: (size) => <InstagramIcon width={size} height={size} aria-hidden="true" />,
};
