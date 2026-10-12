import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AgentResponse } from "../../api/types";
import { AgentDialog } from "./AgentDialog";

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

describe("AgentDialog", () => {
  it("saves public comment replies only after the switch is turned on", async () => {
    createAgent.mockResolvedValue(saved);
    const onSaved = vi.fn();
    render(
      <AgentDialog open agent={null} categories={[]} onClose={() => undefined} onSaved={onSaved} onTest={() => undefined} />,
    );

    const toggle = screen.getByRole("switch", { name: "Responder comentarios en público", hidden: true });
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    const name = document.querySelector<HTMLInputElement>('input[name="name"]');
    if (!name) throw new Error("missing name field");
    await userEvent.type(name, "Ventas");
    await userEvent.click(screen.getByRole("button", { name: "Crear agente", hidden: true }));

    expect(createAgent).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ventas", publicCommentReplies: true }),
    );
    expect(onSaved).toHaveBeenCalledWith(saved, true);
  });

  it("shows the saved setting when editing an agent", () => {
    render(
      <AgentDialog
        open
        agent={saved}
        categories={[]}
        onClose={() => undefined}
        onSaved={() => undefined}
        onTest={() => undefined}
      />,
    );

    expect(screen.getByRole("switch", { name: "Responder comentarios en público", hidden: true })).toBeChecked();
  });
});
