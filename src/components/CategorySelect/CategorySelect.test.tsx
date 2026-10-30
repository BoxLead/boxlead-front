import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CategoryResponse, LeadResponse } from "../../api/types";
import { i18n } from "../../i18n";
import { ToastContext } from "../ui/toast";
import { CategorySelect } from "./CategorySelect";

const lead: LeadResponse = {
  id: "l-1",
  platform: "WHATSAPP",
  externalLeadId: null,
  name: null,
  email: "ana@negocio.com",
  phone: null,
  status: "NEW",
  postSaleOnly: false,
  categoryId: null,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};

const categories: CategoryResponse[] = [
  { id: "c-1", name: "Mayorista", description: null, color: "BLUE", position: 0, leadCount: 0, createdAt: "", updatedAt: "" },
];

describe("CategorySelect", () => {
  it("offers no category and the account categories in English", async () => {
    await i18n.changeLanguage("en");
    render(
      <ToastContext.Provider value={vi.fn()}>
        <CategorySelect lead={lead} categories={categories} />
      </ToastContext.Provider>,
    );
    const select = screen.getByRole("combobox", { name: "Category for ana@negocio.com" });
    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual(["No category", "Mayorista"]);
  });
});
