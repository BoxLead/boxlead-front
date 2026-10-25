import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SOCIAL_PROVIDERS } from "../../util/social";
import { SocialButtons } from "./SocialButtons";

const social = vi.hoisted(() => ({
  enabled: true,
  start: vi.fn<(provider: { id: string }, next: string, acceptedLegal?: unknown) => Promise<void>>(),
}));

vi.mock("../../hooks/useSocialLogin", () => ({
  useSocialLogin: () => ({
    enabled: social.enabled,
    providers: SOCIAL_PROVIDERS,
    start: social.start,
  }),
}));

describe("SocialButtons", () => {
  beforeEach(() => {
    social.enabled = true;
    social.start.mockReset();
    social.start.mockResolvedValue(undefined);
  });

  it("renders nothing when social login is not configured", () => {
    social.enabled = false;
    const { container } = render(<SocialButtons next="/app/inbox" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offers Google and Facebook", () => {
    render(<SocialButtons next="/app/inbox" />);
    expect(screen.getByRole("button", { name: "Continuar con Google" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar con Facebook" })).toBeInTheDocument();
  });

  it("starts the chosen provider with the page to return to and locks the buttons", async () => {
    render(<SocialButtons next="/app/leads?status=NEW" />);
    await userEvent.click(screen.getByRole("button", { name: "Continuar con Facebook" }));
    expect(social.start).toHaveBeenCalledWith(
      expect.objectContaining({ id: "facebook" }),
      "/app/leads?status=NEW",
      undefined,
    );
    expect(screen.getByRole("button", { name: "Continuar con Google" })).toBeDisabled();
  });

  it("carries the accepted legal versions to the provider", async () => {
    const acceptedLegal = [{ kind: "TERMS" as const, version: "2026-11" }];
    render(<SocialButtons next="/app/billing?checkout=STARTER" acceptedLegal={acceptedLegal} />);
    await userEvent.click(screen.getByRole("button", { name: "Continuar con Google" }));
    expect(social.start).toHaveBeenCalledWith(
      expect.objectContaining({ id: "google" }),
      "/app/billing?checkout=STARTER",
      acceptedLegal,
    );
  });

  it("waits while the page says something is missing", async () => {
    const canStart = vi.fn(() => false);
    render(<SocialButtons next="/app/inbox" canStart={canStart} />);
    await userEvent.click(screen.getByRole("button", { name: "Continuar con Google" }));
    expect(canStart).toHaveBeenCalled();
    expect(social.start).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Continuar con Google" })).toBeEnabled();
  });

  it("shows an error and unlocks the buttons when the login cannot start", async () => {
    social.start.mockRejectedValue(new Error("offline"));
    render(<SocialButtons next="/app/inbox" />);
    await userEvent.click(screen.getByRole("button", { name: "Continuar con Google" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos abrir el inicio de sesión");
    expect(screen.getByRole("button", { name: "Continuar con Google" })).toBeEnabled();
  });
});
