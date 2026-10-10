import { api } from "../api/client";
import type { ReplyDraft } from "../api/types";
import { setQueryData } from "./queryCache";

export function draftKey(conversationId: string): string {
  return `/conversations/${conversationId}/draft`;
}

export function clearDraft(conversationId: string) {
  setQueryData<ReplyDraft | undefined>(draftKey(conversationId), () => undefined);
}

export async function discardDraft(conversationId: string): Promise<void> {
  await api.delete(draftKey(conversationId));
  clearDraft(conversationId);
}
