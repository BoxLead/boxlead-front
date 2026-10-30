import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LeadResponse } from "../../api/types";
import { i18n } from "../../i18n";
import { ToastContext } from "../ui/toast";
import { TemperatureSelect } from "./TemperatureSelect";

const lead: LeadResponse = {
  id: "l-1",
  platform: "INSTAGRAM",
  externalLeadId: "123",
  name: null,
  email: null,
  phone: null,
  status: "NEW",
  postSaleOnly: false,
  temperature: null,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};

describe("TemperatureSelect", () => {
  it("lists the temperatures in English", async () => {
    await i18n.changeLanguage("en");
    render(
      <ToastContext.Provider value={vi.fn()}>
        <TemperatureSelect lead={lead} />
      </ToastContext.Provider>,
    );
    const select = screen.getByRole("combobox", { name: "Temperature for Instagram contact" });
    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual(["Unrated", "Cold", "Warm", "Hot"]);
  });
});
