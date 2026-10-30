import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProviderDetails } from "./ProviderDetails";
import { dataFiscalBadge, PROVIDER, providerEntries } from "./provider";

const complete = {
  legalName: "Catvin SRL",
  taxId: "30-00000000-0",
  address: "Calle 123, Ciudad",
  email: "support@boxlead.app",
  hours: "Lunes a viernes",
};

describe("provider details", () => {
  it("shows every field that has a value", () => {
    expect(providerEntries(complete).map((entry) => entry.label)).toEqual(["legalName", "taxId", "address", "email", "hours"]);
  });

  it("leaves out the fields that are still empty", () => {
    const entries = providerEntries({ ...complete, taxId: "", address: "  ", hours: "" });
    expect(entries).toEqual([
      { label: "legalName", value: "Catvin SRL" },
      { label: "email", value: "support@boxlead.app", href: "mailto:support@boxlead.app" },
    ]);
  });

  it("reads Catvin SRL and the support email from the company constants", () => {
    expect(PROVIDER.legalName).toBe("Catvin SRL");
    expect(PROVIDER.email).toBe("support@boxlead.app");
  });

  it("renders the filled fields as a list of terms", () => {
    render(<ProviderDetails provider={{ ...complete, address: "" }} />);
    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual([
      "Razón social",
      "CUIT",
      "Email de atención",
      "Horario de atención",
    ]);
    expect(screen.queryByText("Domicilio")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "support@boxlead.app" })).toHaveAttribute("href", "mailto:support@boxlead.app");
  });

  it("only offers the Data Fiscal badge when ARCA's link and image are set", () => {
    expect(dataFiscalBadge("", "")).toBeNull();
    expect(dataFiscalBadge("https://qr.arca.gob.ar/?qr=abc", "")).toBeNull();
    expect(dataFiscalBadge("", "/data-fiscal.jpg")).toBeNull();
    expect(dataFiscalBadge(" https://qr.arca.gob.ar/?qr=abc ", "/data-fiscal.jpg")).toEqual({
      url: "https://qr.arca.gob.ar/?qr=abc",
      image: "/data-fiscal.jpg",
    });
  });
});
