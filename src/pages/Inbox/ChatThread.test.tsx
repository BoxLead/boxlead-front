import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ContextItem, MessageResponse } from "../../api/types";
import { getPlatform } from "../../platforms";
import { ChatThread } from "./ChatThread";

const NOW = "2026-10-05T12:00:00.000Z";

function message(patch: Partial<MessageResponse>): MessageResponse {
  return {
    id: "m-1",
    conversationId: "c-1",
    direction: "INBOUND",
    externalMessageId: "ext-1",
    kind: "TEXT",
    content: "hola",
    contextRef: null,
    replyToExternalId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}

const reel: ContextItem = {
  kind: "POST",
  externalId: "media-1",
  title: "Flip 6 en stock",
  imageUrl: null,
  url: "https://www.instagram.com/reel/abc/",
  price: null,
  currency: null,
  status: "REELS",
  quantity: null,
  createdAt: null,
  lines: [],
};

function renderThread(messages: MessageResponse[], onReplyToComment = vi.fn().mockResolvedValue(true)) {
  render(
    <ChatThread
      messages={messages}
      pending={[]}
      contactName="nico.audio"
      posts={new Map([[reel.externalId, reel]])}
      commentPolicy={getPlatform("INSTAGRAM").commentReply}
      onRetry={vi.fn()}
      onDiscard={vi.fn()}
      onReplyToComment={onReplyToComment}
    />,
  );
  return onReplyToComment;
}

describe("ChatThread comments", () => {
  it("shows a comment as an event with a link to its post next to the direct messages", () => {
    renderThread([
      message({ id: "m-1", content: "Hola!" }),
      message({ id: "m-2", kind: "COMMENT", externalMessageId: "c-1", contextRef: "media-1", content: "¿Precio?" }),
    ]);

    expect(screen.getByText("Hola!")).toBeInTheDocument();
    expect(screen.getByText("Comentó en un reel")).toBeInTheDocument();
    expect(screen.getByText("¿Precio?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Flip 6 en stock/ })).toHaveAttribute(
      "href",
      "https://www.instagram.com/reel/abc/",
    );
  });

  it("still shows the comment when its post could not be resolved", () => {
    renderThread([message({ kind: "COMMENT", externalMessageId: "c-1", contextRef: "other", content: "¿Precio?" })]);

    expect(screen.getByText("Comentó en una publicación")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("does not link a post whose url is not a web link", () => {
    const unsafe: ContextItem = { ...reel, url: "javascript:alert(1)" };
    render(
      <ChatThread
        messages={[message({ kind: "COMMENT", externalMessageId: "c-1", contextRef: "media-1", content: "¿Precio?" })]}
        pending={[]}
        contactName="nico.audio"
        posts={new Map([[unsafe.externalId, unsafe]])}
        commentPolicy={getPlatform("INSTAGRAM").commentReply}
        onRetry={vi.fn()}
        onDiscard={vi.fn()}
        onReplyToComment={vi.fn()}
      />,
    );

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Flip 6 en stock")).toBeInTheDocument();
  });

  it("sends a public reply to the comment and closes the form", async () => {
    const onReply = renderThread([
      message({ id: "m-2", kind: "COMMENT", externalMessageId: "c-1", contextRef: "media-1", content: "¿Precio?" }),
    ]);

    await userEvent.click(screen.getByRole("button", { name: "Responder en público" }));
    await userEvent.type(screen.getByLabelText("Responder en público a nico.audio"), "$ 289.999");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onReply).toHaveBeenCalledWith("m-2", "$ 289.999");
    expect(screen.queryByLabelText("Responder en público a nico.audio")).toBeNull();
  });

  it("keeps the form open when the public reply fails", async () => {
    renderThread(
      [message({ id: "m-2", kind: "COMMENT", externalMessageId: "c-1", content: "¿Precio?" })],
      vi.fn().mockResolvedValue(false),
    );

    await userEvent.click(screen.getByRole("button", { name: "Responder en público" }));
    await userEvent.type(screen.getByLabelText("Responder en público a nico.audio"), "Hola");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(screen.getByLabelText("Responder en público a nico.audio")).toHaveValue("Hola");
  });

  it("marks a comment that already has a public reply and does not offer to answer it again", () => {
    renderThread([
      message({ id: "m-2", kind: "COMMENT", externalMessageId: "c-1", content: "¿Precio?" }),
      message({
        id: "m-3",
        direction: "OUTBOUND",
        kind: "COMMENT",
        externalMessageId: "c-2",
        replyToExternalId: "c-1",
        content: "Te escribimos",
      }),
    ]);

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Respondido en público")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Responder en público" })).toBeNull();
    expect(within(items[1]).getByText(/Respondiste en público/)).toBeInTheDocument();
  });

  it("does not offer public replies on channels that cannot do them", () => {
    render(
      <ChatThread
        messages={[message({ kind: "COMMENT", externalMessageId: "c-1", content: "¿Precio?" })]}
        pending={[]}
        contactName="nico.audio"
        posts={new Map()}
        onRetry={vi.fn()}
        onDiscard={vi.fn()}
        onReplyToComment={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Responder en público" })).toBeNull();
  });
});
