import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BillingPlan } from "../../api/types";
import { signupPlans, type InvitationCheck } from "../../data/plans";
import { PlanPicker } from "./PlanPicker";

const CATALOG: BillingPlan[] = [
  {
    code: "STARTER",
    name: "Starter",
    versionId: "v1",
    inviteOnly: false,
    price: { amountMinor: 6000, currency: "USD" },
    chargeToday: { amountMinor: 8700000, currency: "ARS" },
    fxRate: { day: "2026-10-24", source: "BNA", rate: "1450.00" },
    frequencyMonths: 1,
    priceIncludesVat: true,
    priceWithoutNationalTaxes: { amountMinor: 7190082, currency: "ARS" },
    limits: { AGENTS_MAX: 3, AGENT_REPLIES_PER_PERIOD: 1000 },
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise",
    versionId: "v2",
    inviteOnly: false,
    contactOnly: true,
    price: null,
    frequencyMonths: null,
    priceIncludesVat: null,
    limits: {},
  },
  {
    code: "DEMO",
    name: "Beta",
    versionId: "v3",
    inviteOnly: true,
    price: null,
    frequencyMonths: null,
    priceIncludesVat: null,
    limits: {},
  },
];

function renderPicker(invitation: InvitationCheck, onChange = vi.fn()) {
  render(
    <PlanPicker plans={signupPlans(CATALOG) ?? { paid: [], beta: null, contact: [] }} invitation={invitation} value={null} onChange={onChange} />,
  );
  return onChange;
}

const plain = (value: string | null) => value?.replace(/\s/g, " ");

describe("PlanPicker", () => {
  it("shows today's price in pesos with the legend and the dollar reference", () => {
    renderPicker({ status: "none" });
    const starter = screen.getByRole("radio", { name: "Starter" });
    const details = plain(document.getElementById(starter.getAttribute("aria-describedby") ?? "")?.textContent ?? null);
    expect(details).toContain("$ 87.000 por mes");
    expect(details).toContain("PRECIO SIN IMPUESTOS NACIONALES $ 71.900,82");
    expect(details).toContain("Referencia USD 60 con IVA incluido");
    expect(details).toContain("Hasta 3 agentes y 1.000 respuestas por mes.");
  });

  it("disables the beta without an invitation and says how to ask for one", () => {
    renderPicker({ status: "none" });
    expect(screen.getByRole("radio", { name: "Beta" })).toBeDisabled();
    expect(screen.getByText(/Es solo por invitación/)).toBeInTheDocument();
  });

  it("enables the beta for the invited email", async () => {
    const onChange = renderPicker({ status: "valid", invitation: { email: "ana@negocio.com", expiresAt: "2026-11-01T00:00:00Z" } });
    await userEvent.click(screen.getByRole("radio", { name: "Beta" }));
    expect(onChange).toHaveBeenCalledWith("DEMO");
    expect(screen.getByText(/ana@negocio.com/)).toBeInTheDocument();
  });

  it("sends Enterprise to a conversation instead of a sign up", () => {
    renderPicker({ status: "none" });
    expect(screen.queryByRole("radio", { name: /Enterprise/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hablá con nosotros" })).toHaveAttribute(
      "href",
      "mailto:support@boxlead.app?subject=Plan%20Enterprise",
    );
  });

  it("explains when there is nothing to pick", () => {
    render(<PlanPicker plans={{ paid: [], beta: null, contact: [] }} invitation={{ status: "none" }} value={null} onChange={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Por ahora no hay planes para elegir");
  });
});
