import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConsumerRequestForm } from "./ConsumerRequestForm";

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderForm() {
  render(<ConsumerRequestForm kind="CANCELLATION" submitLabel="Enviar pedido de baja" sentText="Te escribimos" />);
}

async function submit(email = "ana@negocio.com", details = "") {
  await userEvent.type(screen.getByLabelText("Email de tu cuenta"), email);
  if (details) await userEvent.type(screen.getByLabelText("Detalle (opcional)"), details);
  await userEvent.click(screen.getByRole("button", { name: "Enviar pedido de baja" }));
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("consumer request form", () => {
  it("sends only the kind, the email and the details and shows the code", async () => {
    fetchMock.mockResolvedValueOnce(json({ code: "BX-7KX2M9", createdAt: "2026-10-25T14:00:00Z" }, 202));
    renderForm();
    await submit(" ana@negocio.com ", "Quiero la baja");
    expect(await screen.findByText("BX-7KX2M9")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recibimos tu pedido" })).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/consumer-requests$/);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ kind: "CANCELLATION", email: "ana@negocio.com", details: "Quiero la baja" });
  });

  it("shows the support email when the API does not answer", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderForm();
    await submit();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No pudimos registrar tu pedido");
    expect(screen.getByRole("link", { name: "support@boxlead.app" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:support@boxlead\.app\?subject=Bot%C3%B3n%20de%20baja%20de%20servicio/),
    );
    expect(screen.getByLabelText("Email de tu cuenta")).toHaveValue("ana@negocio.com");
  });

  it("shows the support email when the requests are off", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "Not Found", message: "Not found" }, 404));
    renderForm();
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("support@boxlead.app");
  });

  it("marks the email when the API rejects it", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ error: "Bad Request", message: "Invalid", fields: [{ field: "email", message: "must be a well-formed email address" }] }, 400),
    );
    renderForm();
    await submit("ana@negocio");
    expect(await screen.findByText("Revisá el email.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email de tu cuenta")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not send details longer than the limit", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText("Email de tu cuenta"), "ana@negocio.com");
    await userEvent.click(screen.getByLabelText("Detalle (opcional)"));
    await userEvent.paste("x".repeat(501));
    expect(screen.getByRole("button", { name: "Enviar pedido de baja" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
