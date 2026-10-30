import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ReplyDraft } from "../../api/types";
import { i18n } from "../../i18n";
import { DraftBanner } from "./DraftBanner";

const draft: ReplyDraft = {
  id: "d-1",
  conversationId: "c-1",
  content: "Sí, hay stock",
  agentName: "Ventas",
  basedOnMessageId: "m-1",
  createdAt: "2026-10-05T12:00:00.000Z",
  updatedAt: "2026-10-05T12:00:00.000Z",
};

describe("DraftBanner", () => {
  it("names the agent and offers to send, edit or discard", async () => {
    const onSend = vi.fn();
    const onEdit = vi.fn();
    const onDiscard = vi.fn();
    render(<DraftBanner draft={draft} tooLong={false} busy={false} onSend={onSend} onEdit={onEdit} onDiscard={onDiscard} />);

    expect(screen.getByRole("region", { name: "Borrador de Ventas" })).toHaveTextContent("Sí, hay stock");
    await userEvent.click(screen.getByRole("button", { name: "Enviar borrador" }));
    await userEvent.click(screen.getByRole("button", { name: "Editar borrador" }));
    await userEvent.click(screen.getByRole("button", { name: "Descartar borrador" }));
    expect(onSend).toHaveBeenCalledOnce();
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("blocks sending a draft that is too long", () => {
    render(<DraftBanner draft={draft} tooLong busy={false} onSend={vi.fn()} onEdit={vi.fn()} onDiscard={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Enviar borrador" })).toBeDisabled();
    expect(screen.getByText(/más largo que el máximo/)).toBeInTheDocument();
  });

  it("still has a title when the draft has no agent name", () => {
    render(
      <DraftBanner
        draft={{ ...draft, agentName: null }}
        tooLong={false}
        busy={false}
        onSend={vi.fn()}
        onEdit={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(screen.getByRole("region", { name: "Borrador del agente" })).toBeInTheDocument();
  });
});

describe("DraftBanner in English", () => {
  it("names the agent and warns about a long draft", async () => {
    await i18n.changeLanguage("en");
    render(<DraftBanner draft={draft} tooLong busy={false} onSend={vi.fn()} onEdit={vi.fn()} onDiscard={vi.fn()} />);

    expect(screen.getByRole("region", { name: "Draft by Ventas" })).toBeInTheDocument();
    expect(screen.getByText("The draft is longer than this channel allows. Edit it before sending.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send draft" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard draft" })).toBeInTheDocument();
  });
});
