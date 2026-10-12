import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import type { ConversationResponse } from "../api/types";
import { CONVERSATIONS_KEY, deleteConversation } from "./conversations";
import { clearQueryCache, getQueryState, setQueryData } from "./queryCache";

vi.mock("../api/client", () => ({
  api: { delete: vi.fn() },
}));

const conversation: ConversationResponse = {
  id: "c-1",
  leadId: "lead-1",
  platform: "WHATSAPP",
  externalThreadId: null,
  salesStage: "PRE_SALE",
  status: "OPEN",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

describe("deleteConversation", () => {
  afterEach(() => {
    clearQueryCache();
    vi.clearAllMocks();
  });

  it("drops the conversation from the list after the server accepts it", async () => {
    setQueryData<ConversationResponse[]>(CONVERSATIONS_KEY, () => [conversation, { ...conversation, id: "c-2" }]);
    vi.mocked(api.delete).mockResolvedValue(undefined);

    await deleteConversation(conversation.id);

    expect(api.delete).toHaveBeenCalledWith("/conversations/c-1");
    expect(getQueryState<ConversationResponse[]>(CONVERSATIONS_KEY).data?.map((item) => item.id)).toEqual(["c-2"]);
  });

  it("leaves the list alone when the server rejects the delete", async () => {
    setQueryData<ConversationResponse[]>(CONVERSATIONS_KEY, () => [conversation]);
    vi.mocked(api.delete).mockRejectedValue(new Error("no"));

    await expect(deleteConversation(conversation.id)).rejects.toThrow("no");
    expect(getQueryState<ConversationResponse[]>(CONVERSATIONS_KEY).data).toEqual([conversation]);
  });
});
