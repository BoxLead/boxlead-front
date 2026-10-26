import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QrCode } from "./QrCode";

const URI = "otpauth://totp/BoxLead:equipo%40boxlead.app?secret=JBSWY3DPEHPK3PXP&issuer=BoxLead&algorithm=SHA1&digits=6&period=30";

describe("QrCode", () => {
  it("draws the QR as inline SVG without images or network", () => {
    const { container } = render(<QrCode value={URI} label="Código QR" />);
    const svg = screen.getByRole("img", { name: "Código QR" });
    const [, , width] = (svg.getAttribute("viewBox") ?? "").split(" ").map(Number);
    expect(width).toBeGreaterThanOrEqual(25);
    expect(container.querySelector("path")?.getAttribute("d")).toMatch(/^(M\d+ \d+h1v1h-1z)+$/);
    expect(container.querySelector("img, image")).toBeNull();
  });
});
