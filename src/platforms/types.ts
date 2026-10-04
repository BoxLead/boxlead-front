import type { ReactNode } from "react";
import type { LeadResponse, PlatformType, SalesStage } from "../api/types";

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
  summary: string;
  syncs: string[];
  connect: ConnectMethod | null;
  stageLabels: Partial<Record<SalesStage, string>>;
  reply: (stage: SalesStage) => ReplyPolicy;
  explainError: (status: number, message: string) => PlatformErrorView | null;
  contactFields: (lead: LeadResponse) => ContactField[];
  logo: (size: number) => ReactNode;
};
