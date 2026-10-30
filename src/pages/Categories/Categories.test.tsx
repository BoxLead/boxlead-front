import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { CategoryResponse } from "../../api/types";
import { ToastContext } from "../../components/ui/toast";
import { i18n } from "../../i18n";
import { Categories } from "./Categories";

const categories: CategoryResponse[] = [
  {
    id: "c-1",
    name: "Presupuesto",
    description: null,
    color: "BLUE",
    position: 0,
    leadCount: 3,
    createdAt: "",
    updatedAt: "",
  },
];

vi.mock("../../hooks/useApiQuery", () => ({
  useApiQuery: () => ({ data: categories, error: null, loading: false, reload: () => undefined }),
}));

function renderCategories() {
  render(
    <MemoryRouter>
      <ToastContext.Provider value={() => undefined}>
        <Categories />
      </ToastContext.Provider>
    </MemoryRouter>,
  );
}

describe("Categories", () => {
  it("lists the categories in Spanish", () => {
    renderCategories();
    expect(screen.getByRole("heading", { level: 1, name: "Categorías" })).toBeInTheDocument();
    expect(screen.getByText("Sin descripción")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar Presupuesto" })).toBeInTheDocument();
  });

  it("lists, edits and deletes categories in English", async () => {
    await i18n.changeLanguage("en");
    renderCategories();

    expect(screen.getByRole("heading", { level: 1, name: "Categories" })).toBeInTheDocument();
    expect(screen.getByText("Group your leads by what they need. Each lead can be in one category.")).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Categories" });
    expect(within(list).getByText("No description")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit Presupuesto" }));
    const dialog = within(screen.getByText("Edit category").closest("dialog") ?? document.body);
    expect(dialog.getByDisplayValue("Presupuesto")).toBeInTheDocument();
    expect(dialog.getByPlaceholderText("What kind of leads go in this category")).toBeInTheDocument();
    expect(dialog.getByText("Save changes")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Delete Presupuesto" }));
    expect(screen.getByText("Delete Presupuesto?")).toBeInTheDocument();
    expect(screen.getByText("Its 3 leads will be left without a category.")).toBeInTheDocument();
  });
});
