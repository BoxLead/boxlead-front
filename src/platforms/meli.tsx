import { MercadoLibreMark } from "../components/icons/PlatformIcons";
import { channelT, emailAndPhone, lengthError, reconnectError } from "./shared";
import type { ContextItemKind } from "../api/types";
import type { ContextStatus, PlatformDefinition, PlatformErrorView } from "./types";

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
  const t = channelT();
  if (status === 409 && /none unanswered/i.test(message)) {
    return {
      title: t("platforms.MELI.noQuestionsTitle"),
      detail: t("platforms.MELI.noQuestionsDetail"),
      action: null,
    };
  }
  if (status === 409 && /has no MELI user id/i.test(message)) {
    return {
      title: t("platforms.MELI.noBuyerTitle"),
      detail: t("platforms.MELI.noBuyerDetail"),
      action: null,
    };
  }
  if (status === 409 && /no order\/pack/i.test(message)) {
    return {
      title: t("platforms.MELI.noOrderTitle"),
      detail: t("platforms.MELI.noOrderDetail"),
      action: null,
    };
  }
  if (status === 400 && /limited to 2000/i.test(message)) return lengthError(MELI_ANSWER_LIMIT);
  if (status === 400 && /limited to 350/i.test(message)) return lengthError(MELI_MESSAGE_LIMIT);
  if (status === 400 && /cannot be empty/i.test(message)) {
    return { title: t("platforms.MELI.emptyTitle"), detail: null, action: null };
  }
  if (status === 502 && /HTTP 403/i.test(message)) {
    return {
      title: t("platforms.MELI.blockedTitle"),
      detail: upstreamDetail(message) ?? t("platforms.MELI.blockedDetail"),
      action: null,
    };
  }
  if (status === 502) {
    return {
      title: t("platforms.MELI.rejectedTitle"),
      detail: upstreamDetail(message) ?? t("platforms.MELI.rejectedDetail"),
      action: "retry",
    };
  }
  return null;
}

type Tone = ContextStatus["tone"];

const LISTING_TONES = {
  active: "success",
  paused: "warning",
  closed: "neutral",
  under_review: "warning",
  inactive: "neutral",
} as const satisfies Record<string, Tone>;

const ORDER_TONES = {
  paid: "success",
  confirmed: "neutral",
  payment_required: "warning",
  payment_in_process: "warning",
  partially_paid: "warning",
  partially_refunded: "warning",
  pending_cancel: "danger",
  cancelled: "danger",
  invalid: "danger",
} as const satisfies Record<string, Tone>;

function isKey<T extends object>(table: T, key: string): key is Extract<keyof T, string> {
  return Object.hasOwn(table, key);
}

function contextStatus(kind: ContextItemKind, status: string | null): ContextStatus | null {
  if (!status) return null;
  const key = status.toLowerCase();
  const t = channelT();
  if (kind === "ORDER") {
    return isKey(ORDER_TONES, key)
      ? { label: t(`platforms.MELI.order.${key}`), tone: ORDER_TONES[key] }
      : { label: status, tone: "neutral" };
  }
  return isKey(LISTING_TONES, key)
    ? { label: t(`platforms.MELI.listing.${key}`), tone: LISTING_TONES[key] }
    : { label: status, tone: "neutral" };
}

export const meli: PlatformDefinition = {
  id: "MELI",
  name: "MercadoLibre",
  get accountNoun() {
    return channelT()("platforms.MELI.accountNoun");
  },
  get addAnother() {
    return channelT()("channel.addAccount");
  },
  get summary() {
    return channelT()("platforms.MELI.summary");
  },
  get syncs() {
    return channelT()("platforms.MELI.syncs", { returnObjects: true });
  },
  get howItWorks() {
    return channelT()("platforms.MELI.howItWorks", { returnObjects: true });
  },
  connect: "redirect",
  get stageLabels() {
    const t = channelT();
    return { PRE_SALE: t("platforms.MELI.preSale"), POST_SALE: t("platforms.MELI.postSale") };
  },
  reply: (stage) => {
    const t = channelT();
    return stage === "POST_SALE"
      ? {
          kind: "chat",
          maxLength: MELI_MESSAGE_LIMIT,
          placeholder: t("platforms.MELI.postSalePlaceholder"),
          hint: t("platforms.MELI.postSaleHint"),
        }
      : {
          kind: "questions",
          maxLength: MELI_ANSWER_LIMIT,
          placeholder: t("platforms.MELI.questionPlaceholder"),
          hint: t("platforms.MELI.questionHint"),
        };
  },
  explainError,
  contactFields: emailAndPhone,
  hasContext: true,
  contextStatus,
  externalIdIsContact: false,
  canStartConversation: false,
  logo: (size) => <MercadoLibreMark width={size} height={size} aria-hidden="true" />,
};
