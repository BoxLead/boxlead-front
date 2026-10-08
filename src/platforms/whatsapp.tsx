import { WhatsAppIcon } from "../components/icons/PlatformIcons";
import { lengthError, reconnectError } from "./shared";
import type { ContactField, PlatformDefinition } from "./types";

export const WHATSAPP_TEXT_LIMIT = 4096;

export const whatsapp: PlatformDefinition = {
  id: "WHATSAPP",
  name: "WhatsApp",
  accountNoun: "número de WhatsApp Business",
  addAnother: "Agregar otro número",
  summary: "Atendé los chats de tu número de WhatsApp Business en la misma bandeja.",
  syncs: ["Mensajes que recibe tu número", "Nombre y teléfono de cada contacto"],
  howItWorks: [
    "Iniciás sesión con Facebook y elegís tu número de WhatsApp Business.",
    "Los mensajes que recibe ese número llegan a la bandeja.",
    "Respondés desde BoxLead con el mismo número.",
  ],
  connect: "whatsapp-embedded",
  stageLabels: { PRE_SALE: "Chats" },
  reply: () => ({
    kind: "chat",
    maxLength: WHATSAPP_TEXT_LIMIT,
    placeholder: "Escribí un mensaje",
    hint: null,
  }),
  explainError: (status, message) => {
    const reconnect = reconnectError("WhatsApp", message);
    if (reconnect) return reconnect;
    if (status === 400 && /limited to/i.test(message)) return lengthError(WHATSAPP_TEXT_LIMIT);
    return null;
  },
  contactFields: (lead) => {
    const fields: ContactField[] = [];
    const phone = lead.phone ?? lead.externalLeadId;
    if (phone) {
      const digits = phone.replace(/\D/g, "");
      fields.push({ label: "WhatsApp", value: phone, href: `https://wa.me/${digits}` });
    }
    if (lead.email) fields.push({ label: "Email", value: lead.email, href: `mailto:${lead.email}` });
    return fields;
  },
  hasContext: false,
  contextStatus: () => null,
  externalIdIsContact: true,
  canStartConversation: true,
  colorClass: "platform-color-whatsapp",
  logo: (size) => <WhatsAppIcon width={size} height={size} aria-hidden="true" />,
};
