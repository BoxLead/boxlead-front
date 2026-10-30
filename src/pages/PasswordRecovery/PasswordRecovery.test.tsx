import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../i18n";
import { ForgotPassword } from "./ForgotPassword";
import { ResetPassword } from "./ResetPassword";

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status: number): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderPage(page: React.ReactNode) {
  render(<MemoryRouter>{page}</MemoryRouter>);
}

function callsTo(path: string) {
  return fetchMock.mock.calls.filter(([url]) => String(url).endsWith(path));
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  window.history.replaceState(null, "", "/");
});

describe("forgot password", () => {
  it("points to support while recovery is off", async () => {
    fetchMock.mockResolvedValueOnce(json({ passwordReset: false }, 200));
    renderPage(<ForgotPassword />);
    expect(await screen.findByText(/no se puede recuperar desde acá/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Email" })).not.toBeInTheDocument();
  });

  it("treats a failed options call as off", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderPage(<ForgotPassword />);
    expect(await screen.findByText(/no se puede recuperar desde acá/)).toBeInTheDocument();
  });

  it("sends the trimmed email and always shows the same answer", async () => {
    fetchMock.mockResolvedValueOnce(json({ passwordReset: true }, 200));
    fetchMock.mockResolvedValueOnce(json(undefined, 202));
    renderPage(<ForgotPassword />);
    await userEvent.type(await screen.findByRole("textbox", { name: "Email" }), " ana@negocio.com ");
    await userEvent.click(screen.getByRole("button", { name: "Mandar el link" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Si hay una cuenta con ese email, te mandamos un link para elegir una contraseña nueva. Vence en 30 minutos. Si no lo ves, revisá la carpeta de spam.");
    const [, init] = callsTo("/auth/password/forgot")[0];
    expect(JSON.parse(String(init?.body))).toEqual({ email: "ana@negocio.com" });
  });

  it("shows the limit message when there were too many requests", async () => {
    fetchMock.mockResolvedValueOnce(json({ passwordReset: true }, 200));
    fetchMock.mockResolvedValueOnce(json({ error: "Too many requests", message: "Too many requests" }, 429));
    renderPage(<ForgotPassword />);
    await userEvent.type(await screen.findByRole("textbox", { name: "Email" }), "ana@negocio.com");
    await userEvent.click(screen.getByRole("button", { name: "Mandar el link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("demasiados intentos");
  });
});

describe("reset password", () => {
  it("reads the token from the fragment, removes it and sends it with the new password", async () => {
    window.history.replaceState(null, "", "/nueva-clave#token-de-prueba");
    fetchMock.mockResolvedValueOnce(json(undefined, 204));
    renderPage(<ResetPassword />);
    await userEvent.type(await screen.findByLabelText(/Contraseña/), "una-clave-nueva");
    expect(window.location.hash).toBe("");
    await userEvent.click(screen.getByRole("button", { name: "Guardar la contraseña" }));
    expect(await screen.findByRole("status")).toHaveTextContent("guardamos tu contraseña nueva");
    const [, init] = callsTo("/auth/password/reset")[0];
    expect(JSON.parse(String(init?.body))).toEqual({ token: "token-de-prueba", password: "una-clave-nueva" });
  });

  it("explains an invalid link", async () => {
    window.history.replaceState(null, "", "/nueva-clave#vencido");
    fetchMock.mockResolvedValueOnce(
      json({ error: "Bad Request", message: "The link is invalid or expired", code: "INVALID_TOKEN" }, 400),
    );
    renderPage(<ResetPassword />);
    await userEvent.type(await screen.findByLabelText(/Contraseña/), "una-clave-nueva");
    await userEvent.click(screen.getByRole("button", { name: "Guardar la contraseña" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Este link no sirve");
    expect(screen.getByRole("link", { name: "Pedir un link nuevo" })).toHaveAttribute("href", "/recuperar-clave");
  });

  it("explains a missing token without calling the API", async () => {
    renderPage(<ResetPassword />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Este link no sirve");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("password recovery in English", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("asks for the email and confirms in English", async () => {
    fetchMock.mockResolvedValueOnce(json({ passwordReset: true }, 200)).mockResolvedValueOnce(json(undefined, 202));
    renderPage(<ForgotPassword />);
    expect(screen.getByRole("heading", { name: "Reset your password" })).toBeInTheDocument();
    await userEvent.type(await screen.findByRole("textbox", { name: "Email" }), "ana@negocio.com");
    await userEvent.click(screen.getByRole("button", { name: "Send the link" }));
    expect(await screen.findByRole("status")).toHaveTextContent("If there's an account with that email");
  });

  it("explains an invalid reset link in English", async () => {
    renderPage(<ResetPassword />);
    expect(await screen.findByRole("alert")).toHaveTextContent("This link doesn't work.");
    expect(screen.getByRole("link", { name: "Ask for a new link" })).toHaveAttribute("href", "/recuperar-clave");
  });
});
