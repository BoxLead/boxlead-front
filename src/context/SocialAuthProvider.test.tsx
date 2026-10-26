import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@auth0/auth0-react", () => ({
  Auth0Provider: ({ children }: { children: ReactNode }) => <div data-testid="auth0">{children}</div>,
}));

async function renderAt(path: string) {
  vi.resetModules();
  const { SocialAuthProvider } = await import("./SocialAuthProvider");
  render(
    <MemoryRouter initialEntries={[path]}>
      <SocialAuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <p>
                landing <Link to="/login">entrar</Link>
              </p>
            }
          />
          <Route
            path="/login"
            element={
              <p>
                login <Link to="/app/inbox">app</Link>
              </p>
            }
          />
          <Route path="/app/inbox" element={<p>bandeja</p>} />
        </Routes>
      </SocialAuthProvider>
    </MemoryRouter>,
  );
}

describe("SocialAuthProvider", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_AUTH0_DOMAIN", "tenant.auth0.test");
    vi.stubEnv("VITE_AUTH0_CLIENT_ID", "client");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("leaves the landing and the app without the Auth0 SDK", async () => {
    await renderAt("/app/inbox");
    expect(screen.getByText("bandeja")).toBeInTheDocument();
    expect(screen.queryByTestId("auth0")).not.toBeInTheDocument();
  });

  it("mounts the SDK on the login page and keeps it once mounted", async () => {
    await renderAt("/");
    expect(screen.queryByTestId("auth0")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "entrar" }));
    expect(await screen.findByTestId("auth0")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "app" }));
    expect(screen.getByText("bandeja")).toBeInTheDocument();
    expect(screen.getByTestId("auth0")).toBeInTheDocument();
  });

  it("does nothing when social login is not configured", async () => {
    vi.stubEnv("VITE_AUTH0_DOMAIN", "");
    await renderAt("/login");
    expect(screen.getByText("login")).toBeInTheDocument();
    expect(screen.queryByTestId("auth0")).not.toBeInTheDocument();
  });
});
