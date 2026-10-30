import { InstagramIcon } from "../components/icons/PlatformIcons";
import { channelT, emailAndPhone, lengthError, reconnectError } from "./shared";
import type { PlatformDefinition } from "./types";

export const INSTAGRAM_TEXT_LIMIT = 1000;
export const INSTAGRAM_COMMENT_LIMIT = 2200;
const USERNAME = /^[a-z0-9._]{1,30}$/i;

const POST_TYPES = ["FEED", "REELS", "STORY", "AD", "IGTV"] as const;

type PostType = (typeof POST_TYPES)[number];

function isPostType(value: string): value is PostType {
  return (POST_TYPES as readonly string[]).includes(value);
}

function postLabel(productType: string | null): string {
  const type = productType?.toUpperCase() ?? "";
  return channelT()(`platforms.INSTAGRAM.posts.${isPostType(type) ? type : "FEED"}`);
}

export const instagram: PlatformDefinition = {
  id: "INSTAGRAM",
  name: "Instagram",
  get accountNoun() {
    return channelT()("platforms.INSTAGRAM.accountNoun");
  },
  get addAnother() {
    return channelT()("channel.addAccount");
  },
  get summary() {
    return channelT()("platforms.INSTAGRAM.summary");
  },
  get syncs() {
    return channelT()("platforms.INSTAGRAM.syncs", { returnObjects: true });
  },
  get howItWorks() {
    return channelT()("platforms.INSTAGRAM.howItWorks", { returnObjects: true });
  },
  connect: "redirect",
  get stageLabels() {
    return { PRE_SALE: channelT()("channel.messages") };
  },
  reply: () => ({
    kind: "chat",
    maxLength: INSTAGRAM_TEXT_LIMIT,
    placeholder: channelT()("platforms.INSTAGRAM.placeholder"),
    hint: channelT()("platforms.INSTAGRAM.hint"),
  }),
  commentReply: {
    maxLength: INSTAGRAM_COMMENT_LIMIT,
    get placeholder() {
      return channelT()("platforms.INSTAGRAM.commentPlaceholder");
    },
    postLabel,
  },
  explainError: (status, message) => {
    const reconnect = reconnectError("Instagram", message);
    if (reconnect) return reconnect;
    if (status === 400 && /limited to/i.test(message)) {
      return lengthError(/comments are limited/i.test(message) ? INSTAGRAM_COMMENT_LIMIT : INSTAGRAM_TEXT_LIMIT);
    }
    if (status === 409 && /reply window/i.test(message)) {
      return {
        title: channelT()("platforms.INSTAGRAM.windowTitle"),
        detail: channelT()("platforms.INSTAGRAM.windowDetail"),
        action: null,
      };
    }
    return null;
  },
  contactFields: (lead) => {
    const username = lead.name?.trim();
    const profile = username && USERNAME.test(username)
      ? [{ label: channelT()("channel.profile"), value: `@${username}`, href: `https://www.instagram.com/${username}/` }]
      : [];
    return [...profile, ...emailAndPhone(lead)];
  },
  hasContext: true,
  contextStatus: () => null,
  externalIdIsContact: false,
  canStartConversation: true,
  logo: (size) => <InstagramIcon width={size} height={size} aria-hidden="true" />,
};
