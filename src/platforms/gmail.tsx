import { GmailIcon } from "../components/icons/PlatformIcons";
import { emailAndPhone, reconnectError } from "./shared";
import type { PlatformDefinition } from "./types";

export const gmail: PlatformDefinition = {
  id: "GMAIL",
  name: "Gmail",
  accountNoun: "casilla de Gmail",
  addAnother: "Agregar otra casilla",
  summary: "Recibí las consultas que llegan por correo y respondelas en el mismo hilo.",
  syncs: [
    "Correos nuevos de tu casilla",
    "Nombre y dirección de cada remitente",
    "Solo se conservan los correos de posibles clientes",
  ],
  howItWorks: [
    "Iniciás sesión con Google y autorizás la lectura y el envío de correos.",
    "BoxLead descarta newsletters, avisos y publicidad, y deja en la bandeja lo que parece una consulta.",
    "Respondés desde BoxLead y el correo sale en el mismo hilo.",
  ],
  connect: "redirect",
  stageLabels: { PRE_SALE: "Correos" },
  reply: () => ({
    kind: "chat",
    maxLength: null,
    placeholder: "Escribí tu respuesta",
    hint: "Se envía como respuesta en el mismo hilo del correo.",
  }),
  explainError: (status, message) => {
    const reconnect = reconnectError("Gmail", message);
    if (reconnect) return reconnect;
    if (status === 409 && /no valid email address/i.test(message)) {
      return {
        title: "No hay una dirección válida",
        detail: "No pudimos leer la dirección de este contacto, así que no se puede responder por correo.",
        action: null,
      };
    }
    return null;
  },
  contactFields: emailAndPhone,
  hasContext: false,
  contextStatus: () => null,
  externalIdIsContact: true,
  canStartConversation: false,
  logo: (size) => <GmailIcon width={size} height={size} aria-hidden="true" />,
};
