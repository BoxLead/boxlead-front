import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountView } from "../../api/types";
import { clearReauthToken, keepReauthToken } from "../../data/reauth";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

const fetchMock = vi.fn<typeof fetch>();
const assign = vi.fn();

const PASSWORD_ACCOUNT: AccountView = {
  name: "Ana",
  email: "ana@negocio.com",
  pendingEmail: null,
  emailVerified: true,
  hasPassword: true,
  providers: [],
};

const SOCIAL_ACCOUNT: AccountView = { ...PASSWORD_ACCOUNT, hasPassword: false, providers: ["GOOGLE"] };

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderDialog(account: AccountView) {
  render(
    <MemoryRouter>
      <DeleteAccountDialog account={account} onClose={() => undefined} />
    </MemoryRouter>,
  );
}

function sentBody(): unknown {
  return JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("location", { ...window.location, assign });
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  assign.mockReset();
  clearReauthToken();
});

describe("delete account dialog", () => {
  it("needs the password and the word before deleting", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    renderDialog(PASSWORD_ACCOUNT);
    const submit = screen.getByRole("button", { name: "Borrar mi cuenta", hidden: true });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Tu contraseña"), "clave");
    await userEvent.type(screen.getByLabelText("Escribí BORRAR para confirmar"), "borrar");
    expect(submit).toBeDisabled();
    await userEvent.clear(screen.getByLabelText("Escribí BORRAR para confirmar"));
    await userEvent.type(screen.getByLabelText("Escribí BORRAR para confirmar"), "BORRAR");
    await userEvent.click(submit);
    expect(sentBody()).toEqual({ password: "clave", confirmation: "BORRAR" });
    expect(assign).toHaveBeenCalledWith("/");
  });

  it("points to the cancellation when a subscription is open", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "Conflict", message: "x", code: "SUBSCRIPTION_OPEN" }, 409));
    renderDialog(PASSWORD_ACCOUNT);
    await userEvent.type(screen.getByLabelText("Tu contraseña"), "clave");
    await userEvent.type(screen.getByLabelText("Escribí BORRAR para confirmar"), "BORRAR");
    await userEvent.click(screen.getByRole("button", { name: "Borrar mi cuenta", hidden: true }));
    expect(await screen.findByRole("alert", { hidden: true })).toHaveTextContent("Primero cancelá tu suscripción");
    expect(screen.getByRole("link", { name: "Pedir la baja", hidden: true })).toHaveAttribute("href", "/baja");
    expect(assign).not.toHaveBeenCalled();
  });

  it("asks a social account to sign in again with its own provider", () => {
    renderDialog(SOCIAL_ACCOUNT);
    expect(screen.getByRole("link", { name: "Entrar con Google", hidden: true })).toHaveAttribute(
      "href",
      "/reingresar?proveedor=google",
    );
    expect(screen.queryByRole("link", { name: "Entrar con Facebook", hidden: true })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Borrar mi cuenta", hidden: true })).toBeDisabled();
  });

  it("sends the token of the new sign in of a social account", async () => {
    keepReauthToken("id-token");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    renderDialog(SOCIAL_ACCOUNT);
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("Ya confirmaste que sos vos.");
    await userEvent.type(screen.getByLabelText("Escribí BORRAR para confirmar"), "BORRAR");
    await userEvent.click(screen.getByRole("button", { name: "Borrar mi cuenta", hidden: true }));
    expect(sentBody()).toEqual({ idToken: "id-token", confirmation: "BORRAR" });
  });
});
