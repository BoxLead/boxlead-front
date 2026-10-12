import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CategoryResponse } from "../../api/types";
import { emptyScope, newScopeDraft, type ScopeDraft } from "../../util/agents";
import { ScopesEditor } from "./ScopesEditor";

const categories: CategoryResponse[] = [
  {
    id: "c-1",
    name: "Presupuesto",
    description: null,
    color: "GREEN",
    position: 0,
    leadCount: 0,
    createdAt: "",
    updatedAt: "",
  },
];

function renderEditor(drafts: ScopeDraft[], onChange = vi.fn()) {
  render(<ScopesEditor drafts={drafts} categories={categories} onChange={onChange} />);
  return onChange;
}

describe("ScopesEditor", () => {
  it("lets a rule pick a channel, a category, a stage and a mode", () => {
    renderEditor([newScopeDraft()]);
    const row = screen.getByRole("group", { name: "Regla 1" });
    expect(within(row).getByLabelText("Canal")).toHaveDisplayValue("Todos los canales");
    expect(within(row).getByLabelText("Categoría")).toHaveDisplayValue("Todas las categorías");
    expect(within(row).getByLabelText("Etapa")).toHaveDisplayValue("Todas las etapas");
    expect(within(row).getByLabelText("Modo")).toHaveDisplayValue("Automático");
    expect(within(row).getByLabelText("Etapa")).toContainHTML("Preventa");
    expect(within(row).getByLabelText("Etapa")).toContainHTML("Postventa");
  });

  it("narrows the stages to those of the chosen channel", async () => {
    const onChange = renderEditor([newScopeDraft()]);
    await userEvent.selectOptions(screen.getByLabelText("Canal"), "MELI");
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ scope: { platform: "MELI", categoryId: null, salesStage: null, replyMode: "AUTO" } }),
    ]);
  });

  it("adds a rule and refuses to remove the last one", async () => {
    const onChange = renderEditor([newScopeDraft()]);
    expect(screen.getByRole("button", { name: "Quitar regla 1" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Agregar regla" }));
    expect(onChange.mock.calls[0][0]).toHaveLength(2);
  });

  it("flags a rule whose category no longer exists", () => {
    renderEditor([newScopeDraft({ ...emptyScope(), categoryId: "gone" })]);
    expect(screen.getByText("Esta categoría ya no existe. Quitá la regla o elegí otra.")).toBeInTheDocument();
    expect(screen.getByLabelText("Categoría")).toHaveDisplayValue("Categoría eliminada");
  });
});
