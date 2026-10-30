import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LeadResponse } from "../../api/types";
import { i18n } from "../../i18n";
import { ToastContext } from "../ui/toast";
import { StatusSelect } from "./StatusSelect";

const lead: LeadResponse = {
  id: "l-1",
  platform: "WHATSAPP",
  externalLeadId: null,
  name: "Ana",
  email: null,
  phone: null,
  status: "CONTACTED",
  postSaleOnly: false,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};

function renderSelect() {
  render(
    <ToastContext.Provider value={vi.fn()}>
      <StatusSelect lead={lead} />
    </ToastContext.Provider>,
  );
}

describe("StatusSelect", () => {
  it("names the lead and lists the statuses in Spanish", () => {
    renderSelect();
    const select = screen.getByRole("combobox", { name: "Estado de Ana" });
    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Nuevo",
      "Contactado",
      "Calificado",
      "Perdido",
      "Cerrado",
    ]);
  });

  it("names the lead and lists the statuses in English", async () => {
    await i18n.changeLanguage("en");
    renderSelect();
    const select = screen.getByRole("combobox", { name: "Status for Ana" });
    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "New",
      "Contacted",
      "Qualified",
      "Lost",
      "Closed",
    ]);
  });
});
