import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MessageResponse } from "../../api/types";
import { clearQueryCache, getQueryState, setQueryData, setQueryFetcher } from "../../data/queryCache";
import { mergeMessages, newerThan, pollNewerMessages } from "./useConversationMessages";

const message = (id: string, createdAt: string): MessageResponse => ({
  id,
  conversationId: "c",
  direction: "INBOUND",
  externalMessageId: null,
  kind: "TEXT",
  content: id,
  replyToExternalId: null,
  createdAt,
  updatedAt: createdAt,
});

const fetcher = vi.fn<(key: string) => Promise<unknown>>();
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  clearQueryCache();
  setQueryFetcher(fetcher);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  setQueryFetcher(null);
  vi.unstubAllGlobals();
});

describe("mergeMessages", () => {
  it("keeps the same reference when nothing is new and appends in order otherwise", () => {
    const current = [message("a", "2026-10-25T10:00:00Z"), message("b", "2026-10-25T10:01:00Z")];
    expect(mergeMessages(current, [current[1]])).toBe(current);
    const merged = mergeMessages(current, [message("c", "2026-10-25T10:00:30Z"), current[0]]);
    expect(merged.map((item) => item.id)).toEqual(["a", "c", "b"]);
  });

  it("asks from a little before the last message so equal timestamps are not lost", () => {
    expect(newerThan([message("a", "2026-10-25T10:00:00.000Z")])).toBe("2026-10-25T09:59:58.000Z");
    expect(newerThan([])).toBeNull();
  });
});

describe("pollNewerMessages", () => {
  it("fetches only the newer messages and merges them into the cache", async () => {
    const known = [message("a", "2026-10-25T10:00:00Z")];
    setQueryData<MessageResponse[]>("/conversations/c/messages", () => known);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([known[0], message("b", "2026-10-25T10:05:00Z")]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await pollNewerMessages("c");

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/conversations/c/messages?after=2026-10-25T09%3A59%3A58.000Z");
    expect(getQueryState<MessageResponse[]>("/conversations/c/messages").data?.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("does nothing before the first full load", async () => {
    await pollNewerMessages("empty");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
