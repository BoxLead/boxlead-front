import type { UnsubscribeScope } from "../../api/types";
import { readUnsubscribeScope } from "../../data/notifications";

export type UnsubscribeLink = { token: string; scope: UnsubscribeScope } | null;

export function readUnsubscribeLink(search: string): UnsubscribeLink {
  const params = new URLSearchParams(search);
  const token = params.get("token")?.trim() ?? "";
  if (!token) return null;
  return { token, scope: readUnsubscribeScope(params.get("scope")) ?? "ALL" };
}
