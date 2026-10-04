import { MessengerIcon } from "../components/icons/PlatformIcons";
import { emailAndPhone, lengthError, reconnectError } from "./shared";
import type { PlatformDefinition } from "./types";

export const MESSENGER_TEXT_LIMIT = 2000;

export const messenger: PlatformDefinition = {
  id: "META",
  name: "Messenger",
  accountNoun: "página de Facebook",
  addAnother: "Agregar otra página",
  summary: "Respondé los mensajes que llegan a tu página de Facebook.",
  syncs: ["Mensajes de tu página"],
  howItWorks: [
    "Iniciás sesión con Facebook y elegís tu página.",
    "Los mensajes que recibe la página llegan a la bandeja.",
    "Respondés desde BoxLead en nombre de la página.",
  ],
  connect: "redirect",
  stageLabels: { PRE_SALE: "Mensajes" },
  reply: () => ({
    kind: "chat",
    maxLength: MESSENGER_TEXT_LIMIT,
    placeholder: "Escribí un mensaje",
    hint: null,
  }),
  explainError: (status, message) => {
    const reconnect = reconnectError("Messenger", message);
    if (reconnect) return reconnect;
    if (status === 400 && /limited to/i.test(message)) return lengthError(MESSENGER_TEXT_LIMIT);
    return null;
  },
  contactFields: emailAndPhone,
  logo: (size) => <MessengerIcon width={size} height={size} aria-hidden="true" />,
};
