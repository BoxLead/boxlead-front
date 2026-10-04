import type {
  ConversationResponse,
  LeadResponse,
  MessageResponse,
  PlatformType,
  SalesStage,
} from "../../api/types";
import { getPlatform } from "../../platforms";
import { leadDisplayName } from "../../util/labels";

export type ChannelFilter = PlatformType | "ALL";

export type InboxFilters = {
  channel: ChannelFilter;
  stage: SalesStage | null;
  query: string;
  unreadOnly: boolean;
};

export type ConversationRow = ConversationResponse & {
  displayName: string;
  activityAt: string;
  unread: number;
  awaitingReply: boolean;
};

const ANSWER_SUFFIX = ":answer";

export function toRows(
  conversations: ConversationResponse[],
  leads: Map<string, LeadResponse>,
): ConversationRow[] {
  return conversations
    .map((conversation) => {
      const lead = leads.get(conversation.leadId);
      const displayName =
        conversation.leadName?.trim() ||
        (lead ? leadDisplayName(lead) : `Contacto de ${getPlatform(conversation.platform).name}`);
      return {
        ...conversation,
        displayName,
        activityAt: conversation.lastMessageAt ?? conversation.updatedAt,
        unread: conversation.unreadCount ?? 0,
        awaitingReply: conversation.lastMessageDirection === "INBOUND",
      };
    })
    .sort((a, b) => b.activityAt.localeCompare(a.activityAt));
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-AR");
}

export function filterRows(rows: ConversationRow[], filters: InboxFilters): ConversationRow[] {
  const query = normalize(filters.query.trim());
  return rows.filter(
    (row) =>
      (filters.channel === "ALL" || row.platform === filters.channel) &&
      (!filters.stage || row.salesStage === filters.stage) &&
      (!filters.unreadOnly || row.unread > 0) &&
      (!query ||
        normalize(row.displayName).includes(query) ||
        normalize(row.lastMessagePreview ?? "").includes(query)),
  );
}

export function unreadBy<K extends string>(
  rows: ConversationRow[],
  key: (row: ConversationRow) => K,
): Partial<Record<K, number>> {
  const counts: Partial<Record<K, number>> = {};
  for (const row of rows) {
    if (row.unread > 0) counts[key(row)] = (counts[key(row)] ?? 0) + row.unread;
  }
  return counts;
}

export function channelsIn(rows: ConversationRow[], order: PlatformType[]): PlatformType[] {
  const present = new Set(rows.map((row) => row.platform));
  return [...order.filter((id) => present.has(id)), ...[...present].filter((id) => !order.includes(id))];
}

export type QuestionEntry = {
  question: MessageResponse;
  answer: MessageResponse | null;
  contextRef: string | null;
};

export type QuestionThread = {
  entries: QuestionEntry[];
  pending: QuestionEntry[];
  nextToAnswer: QuestionEntry | null;
};

export function pairQuestions(messages: MessageResponse[]): QuestionThread {
  const answers = new Map<string, MessageResponse>();
  for (const message of messages) {
    const id = message.externalMessageId;
    if (message.direction === "OUTBOUND" && id?.endsWith(ANSWER_SUFFIX)) {
      answers.set(id.slice(0, -ANSWER_SUFFIX.length), message);
    }
  }
  const entries = messages
    .filter((message) => message.direction === "INBOUND")
    .map((question) => {
      const answer = question.externalMessageId ? answers.get(question.externalMessageId) ?? null : null;
      return {
        question,
        answer,
        contextRef: question.contextRef ?? answer?.contextRef ?? null,
      };
    });
  const pending = entries.filter((entry) => !entry.answer);
  return { entries, pending, nextToAnswer: pending[0] ?? null };
}

export type DayGroup<T> = { day: string; label: string; items: T[] };

export function dayLabel(iso: string, now = Date.now()): string {
  const date = new Date(iso);
  const today = new Date(now);
  const yesterday = new Date(now - 86_400_000);
  if (date.toDateString() === today.toDateString()) return "Hoy";
  if (date.toDateString() === yesterday.toDateString()) return "Ayer";
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(date.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  });
}

export function groupByDay<T extends { createdAt: string }>(items: T[], now = Date.now()): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const day = new Date(item.createdAt).toDateString();
    const last = groups.at(-1);
    if (last && last.day === day) {
      last.items.push(item);
    } else {
      groups.push({ day, label: dayLabel(item.createdAt, now), items: [item] });
    }
  }
  return groups;
}
