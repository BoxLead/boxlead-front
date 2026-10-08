import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ContextItem, MessageResponse } from "../../api/types";
import { missingPostRefs, useMissingPostRefresh } from "./useMissingPostRefresh";

const comment = (contextRef: string | null): MessageResponse => ({
  id: `m-${contextRef}`,
  conversationId: "c",
  direction: "INBOUND",
  externalMessageId: `e-${contextRef}`,
  kind: "COMMENT",
  content: "hola",
  contextRef,
  replyToExternalId: null,
  createdAt: "2026-10-01T10:00:00Z",
  updatedAt: "2026-10-01T10:00:00Z",
});

const post = (externalId: string): ContextItem => ({
  kind: "POST",
  externalId,
  title: null,
  imageUrl: null,
  url: null,
  price: null,
  currency: null,
  status: null,
  quantity: null,
  createdAt: null,
  lines: [],
});

describe("missingPostRefs", () => {
  it("lists the posts of the comments that the context does not include yet, once each", () => {
    const messages = [comment("a"), comment("a"), comment("b"), comment(null), { ...comment("c"), kind: "TEXT" as const }];

    expect(missingPostRefs(messages, new Map([["b", post("b")]]))).toEqual(["a"]);
  });
});

describe("useMissingPostRefresh", () => {
  it("reloads the context once when a comment arrives for a post it does not include", () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ messages }) => useMissingPostRefresh(messages, new Map(), true, reload),
      { initialProps: { messages: [comment("a")] } },
    );
    expect(reload).toHaveBeenCalledTimes(1);

    rerender({ messages: [comment("a")] });
    expect(reload).toHaveBeenCalledTimes(1);

    rerender({ messages: [comment("a"), comment("b")] });
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("waits for the first load of the context", () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useMissingPostRefresh([comment("a")], new Map(), false, reload));

    expect(reload).not.toHaveBeenCalled();
  });
});
