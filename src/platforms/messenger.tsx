import { MessengerIcon } from "../components/icons/PlatformIcons";
import { channelT, emailAndPhone, lengthError, reconnectError } from "./shared";
import type { PlatformDefinition } from "./types";

export const MESSENGER_TEXT_LIMIT = 2000;

export const messenger: PlatformDefinition = {
  id: "META",
  name: "Messenger",
  get accountNoun() {
    return channelT()("platforms.META.accountNoun");
  },
  get addAnother() {
    return channelT()("platforms.META.addAnother");
  },
  get summary() {
    return channelT()("platforms.META.summary");
  },
  get syncs() {
    return channelT()("platforms.META.syncs", { returnObjects: true });
  },
  get howItWorks() {
    return channelT()("platforms.META.howItWorks", { returnObjects: true });
  },
  connect: "redirect",
  get stageLabels() {
    return { PRE_SALE: channelT()("channel.messages") };
  },
  reply: () => ({
    kind: "chat",
    maxLength: MESSENGER_TEXT_LIMIT,
    placeholder: channelT()("channel.messagePlaceholder"),
    hint: null,
  }),
  explainError: (status, message) => {
    const reconnect = reconnectError("Messenger", message);
    if (reconnect) return reconnect;
    if (status === 400 && /limited to/i.test(message)) return lengthError(MESSENGER_TEXT_LIMIT);
    if (status === 409 && /reply window/i.test(message)) {
      return {
        title: channelT()("platforms.META.windowTitle"),
        detail: channelT()("platforms.META.windowDetail"),
        action: null,
      };
    }
    return null;
  },
  contactFields: emailAndPhone,
  hasContext: false,
  contextStatus: () => null,
  externalIdIsContact: false,
  canStartConversation: true,
  logo: (size) => <MessengerIcon width={size} height={size} aria-hidden="true" />,
};
