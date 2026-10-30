import { WhatsAppIcon } from "../components/icons/PlatformIcons";
import { channelT, lengthError, reconnectError } from "./shared";
import type { ContactField, PlatformDefinition } from "./types";

export const WHATSAPP_TEXT_LIMIT = 4096;

export const whatsapp: PlatformDefinition = {
  id: "WHATSAPP",
  name: "WhatsApp",
  get accountNoun() {
    return channelT()("platforms.WHATSAPP.accountNoun");
  },
  get addAnother() {
    return channelT()("platforms.WHATSAPP.addAnother");
  },
  get summary() {
    return channelT()("platforms.WHATSAPP.summary");
  },
  get syncs() {
    return channelT()("platforms.WHATSAPP.syncs", { returnObjects: true });
  },
  get howItWorks() {
    return channelT()("platforms.WHATSAPP.howItWorks", { returnObjects: true });
  },
  connect: "whatsapp-embedded",
  get stageLabels() {
    return { PRE_SALE: channelT()("platforms.WHATSAPP.preSale") };
  },
  supportsTemplates: true,
  reply: () => ({
    kind: "chat",
    maxLength: WHATSAPP_TEXT_LIMIT,
    placeholder: channelT()("channel.messagePlaceholder"),
    hint: null,
  }),
  explainError: (status, message) => {
    const reconnect = reconnectError("WhatsApp", message);
    if (reconnect) return reconnect;
    if (status === 400 && /limited to/i.test(message)) return lengthError(WHATSAPP_TEXT_LIMIT);
    if (status === 409 && /reply window/i.test(message)) {
      return {
        title: channelT()("platforms.WHATSAPP.windowTitle"),
        detail: channelT()("platforms.WHATSAPP.windowDetail"),
        action: "template",
      };
    }
    return null;
  },
  contactFields: (lead) => {
    const fields: ContactField[] = [];
    const phone = lead.phone ?? lead.externalLeadId;
    if (phone) {
      const digits = phone.replace(/\D/g, "");
      fields.push({ label: "WhatsApp", value: phone, href: `https://wa.me/${digits}` });
    }
    if (lead.email) fields.push({ label: channelT()("channel.email"), value: lead.email, href: `mailto:${lead.email}` });
    return fields;
  },
  hasContext: false,
  contextStatus: () => null,
  externalIdIsContact: true,
  canStartConversation: true,
  logo: (size) => <WhatsAppIcon width={size} height={size} aria-hidden="true" />,
};
