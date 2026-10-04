import { InstagramIcon } from "../components/icons/PlatformIcons";
import { emailAndPhone, lengthError, reconnectError } from "./shared";
import type { PlatformDefinition } from "./types";

export const INSTAGRAM_TEXT_LIMIT = 1000;
const USERNAME = /^[a-z0-9._]{1,30}$/i;

export const instagram: PlatformDefinition = {
  id: "INSTAGRAM",
  name: "Instagram",
  accountNoun: "cuenta profesional",
  addAnother: "Agregar otra cuenta",
  summary: "Respondé mensajes directos y seguí los comentarios de tus publicaciones y reels.",
  syncs: ["Mensajes directos", "Comentarios en publicaciones y reels"],
  howItWorks: [
    "Autorizás a BoxLead desde tu cuenta profesional de Instagram.",
    "Los mensajes directos y los comentarios llegan a la bandeja.",
    "Respondés los mensajes directos desde BoxLead.",
  ],
  connect: "redirect",
  stageLabels: { PRE_SALE: "Mensajes" },
  reply: () => ({
    kind: "chat",
    maxLength: INSTAGRAM_TEXT_LIMIT,
    placeholder: "Escribí un mensaje directo",
    hint: null,
  }),
  explainError: (status, message) => {
    const reconnect = reconnectError("Instagram", message);
    if (reconnect) return reconnect;
    if (status === 400 && /limited to/i.test(message)) return lengthError(INSTAGRAM_TEXT_LIMIT);
    return null;
  },
  contactFields: (lead) => {
    const username = lead.name?.trim();
    const profile = username && USERNAME.test(username)
      ? [{ label: "Perfil", value: `@${username}`, href: `https://www.instagram.com/${username}/` }]
      : [];
    return [...profile, ...emailAndPhone(lead)];
  },
  logo: (size) => <InstagramIcon width={size} height={size} aria-hidden="true" />,
};
