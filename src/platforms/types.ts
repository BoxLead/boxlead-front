import type { ReactNode } from "react";
import type { ContextItemKind, LeadResponse, PlatformType, SalesStage } from "../api/types";

export type ThreadKind = "chat" | "questions";

export type ReplyPolicy = {
  kind: ThreadKind;
  maxLength: number | null;
  placeholder: string;
  hint: string | null;
};

export type ErrorAction = "reconnect" | "retry" | null;

export type PlatformErrorView = {
  title: string;
  detail: string | null;
  action: ErrorAction;
};

export type ContextStatus = {
  label: string;
  tone: "neutral" | "success" | "warning" | "danger";
};

export type ConnectMethod = "redirect" | "whatsapp-embedded";

export type ContactField = {
  label: string;
  value: string;
  href: string | null;
};

export type PlatformDefinition = {
  id: PlatformType;
  name: string;
  accountNoun: string;
  addAnother: string;
  summary: string;
  syncs: string[];
  howItWorks: string[];
  connect: ConnectMethod | null;
  stageLabels: Partial<Record<SalesStage, string>>;
  reply: (stage: SalesStage) => ReplyPolicy;
  explainError: (status: number, message: string) => PlatformErrorView | null;
  contactFields: (lead: LeadResponse) => ContactField[];
  hasContext: boolean;
  contextStatus: (kind: ContextItemKind, status: string | null) => ContextStatus | null;
  canStartConversation: boolean;
  externalIdIsContact: boolean;
  colorClass: string;
  logo: (size: number) => ReactNode;
};
