import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext, SESSION_FLAGS_OFF, type AuthContextValue } from "../../context/auth";
import { SocialCallback } from "./SocialCallback";

const auth0 = vi.hoisted(() => ({
  handleRedirectCallback: vi.fn(),
  getIdTokenClaims: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@auth0/auth0-react", () => ({ useAuth0: () => auth0 }));

class ProviderError extends Error {
  readonly error: string;

  constructor(error: string) {
    super(error);
    this.error = error;
  }
}

function renderCallback(sessionError: string | null = null) {
  const socialLogin = vi.fn().mockResolvedValue(undefined);
  const value: AuthContextValue = {
    ...SESSION_FLAGS_OFF,
    user: null,
    login: vi.fn(),
    register: vi.fn(),
    socialLogin,
    logout: vi.fn(),
    isLoading: false,
    error: sessionError,
    clearError: vi.fn(),
  };
  render(
    <MemoryRouter>
      <AuthContext.Provider value={value}>
        <SocialCallback />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return { socialLogin };
}

describe("SocialCallback", () => {
  beforeEach(() => {
    auth0.handleRedirectCallback.mockReset();
    auth0.getIdTokenClaims.mockReset();
    auth0.logout.mockReset();
    auth0.handleRedirectCallback.mockResolvedValue({ appState: { next: "/app/leads?status=NEW" } });
    auth0.getIdTokenClaims.mockResolvedValue({ __raw: "id-token" });
    auth0.logout.mockResolvedValue(undefined);
  });

  it("exchanges the provider token for a session and goes back to the saved page", async () => {
    const { socialLogin } = renderCallback();
    await waitFor(() => expect(socialLogin).toHaveBeenCalledWith("id-token", "/app/leads?status=NEW"));
    expect(socialLogin).toHaveBeenCalledTimes(1);
    expect(auth0.logout).toHaveBeenCalledWith({ openUrl: false });
  });

  it("ignores a saved page outside the app", async () => {
    auth0.handleRedirectCallback.mockResolvedValue({ appState: { next: "https://evil.test/app" } });
    const { socialLogin } = renderCallback();
    await waitFor(() => expect(socialLogin).toHaveBeenCalledWith("id-token", undefined));
  });

  it("explains a login the person cancelled", async () => {
    auth0.handleRedirectCallback.mockRejectedValue(new ProviderError("access_denied"));
    const { socialLogin } = renderCallback();
    expect(await screen.findByRole("alert")).toHaveTextContent("Cancelaste el inicio de sesión");
    expect(socialLogin).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Volver a iniciar sesión" })).toHaveAttribute("href", "/login");
  });

  it("fails when the provider returns no id token", async () => {
    auth0.getIdTokenClaims.mockResolvedValue(undefined);
    const { socialLogin } = renderCallback();
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos iniciar sesión con tu cuenta");
    expect(socialLogin).not.toHaveBeenCalled();
  });

  it("shows the API error when the session cannot be created", () => {
    renderCallback("A verified email is required");
    expect(screen.getByRole("alert")).toHaveTextContent("A verified email is required");
  });
});
