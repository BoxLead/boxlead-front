import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AgentResponse } from "../../api/types";
import { AgentForm } from "./AgentForm";

const createAgent = vi.fn();
const updateAgent = vi.fn();

vi.mock("../../data/agents", () => ({
  createAgent: (...args: unknown[]) => createAgent(...args),
  updateAgent: (...args: unknown[]) => updateAgent(...args),
}));

const saved: AgentResponse = {
  id: "a-1",
  name: "Ventas",
  instructions: "",
  enabled: true,
  publicCommentReplies: true,
  position: 0,
  scopes: [{ id: "s-1", platform: null, categoryId: null, salesStage: null, replyMode: "AUTO" }],
  createdAt: null,
  updatedAt: null,
};

function renderForm(agent: AgentResponse | null) {
  const onSaved = vi.fn();
  render(
    <AgentForm
      agent={agent}
      categories={[]}
      onSaved={onSaved}
      onDiscardNew={() => undefined}
      onDirtyChange={() => undefined}
      onSnapshot={() => undefined}
    />,
  );
  return onSaved;
}

describe("AgentForm", () => {
  it("saves public comment replies only after the switch is turned on", async () => {
    createAgent.mockResolvedValue(saved);
    const onSaved = renderForm(null);

    const toggle = screen.getByRole("switch", { name: "Responder comentarios en público" });
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    await userEvent.type(screen.getByRole("textbox", { name: /Nombre/ }), "Ventas");
    await userEvent.click(screen.getByRole("button", { name: "Crear agente" }));

    expect(createAgent).toHaveBeenCalledWith(expect.objectContaining({ name: "Ventas", publicCommentReplies: true }));
    expect(onSaved).toHaveBeenCalledWith(saved, true);
  });

  it("shows the saved setting when editing an agent", () => {
    renderForm(saved);
    expect(screen.getByRole("switch", { name: "Responder comentarios en público" })).toBeChecked();
  });
});
