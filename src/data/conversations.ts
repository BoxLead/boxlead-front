import { api } from "../api/client";
import type { ConversationResponse } from "../api/types";
import { invalidateQueries, setQueryData } from "./queryCache";

export const CONVERSATIONS_KEY = "/conversations";

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`${CONVERSATIONS_KEY}/${id}`);
  setQueryData<ConversationResponse[]>(CONVERSATIONS_KEY, (current) =>
    (current ?? []).filter((conversation) => conversation.id !== id),
  );
  void invalidateQueries(CONVERSATIONS_KEY);
}
