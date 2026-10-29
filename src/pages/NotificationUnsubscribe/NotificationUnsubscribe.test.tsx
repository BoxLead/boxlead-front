import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import { NotificationUnsubscribe } from "./NotificationUnsubscribe";
import { readUnsubscribeLink } from "./unsubscribeLink";

vi.mock(import("../../api/client"), async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, api: { ...original.api, post: vi.fn() } };
});

function page(path: string) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <NotificationUnsubscribe />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.mocked(api.post).mockResolvedValue(undefined);
});

describe("unsubscribe link", () => {
  it("reads the token and the scope, with every mail when the scope is unknown", () => {
    expect(readUnsubscribeLink("?token=abc&scope=HANDOFF")).toEqual({ token: "abc", scope: "HANDOFF" });
    expect(readUnsubscribeLink("?token=abc")).toEqual({ token: "abc", scope: "ALL" });
    expect(readUnsubscribeLink("?token=abc&scope=OTHER")).toEqual({ token: "abc", scope: "ALL" });
    expect(readUnsubscribeLink("?scope=NEW_LEAD")).toBeNull();
    expect(readUnsubscribeLink("?token=%20")).toBeNull();
  });
});

describe("NotificationUnsubscribe", () => {
  it("renders the same neutral markup on the server whatever the query says", () => {
    const html = renderToString(page("/avisos/baja?token=abc&scope=NEW_LEAD"));
    expect(html).toContain("Dejar de recibir avisos");
    expect(html).not.toContain("leads nuevos");
    expect(html).not.toContain("le falta una parte");
  });

  it("says what will stop and unsubscribes on purpose", async () => {
    render(page("/avisos/baja?token=abc&scope=NEW_LEAD"));
    expect(screen.getByRole("heading", { level: 1, name: "Dejar de recibir avisos" })).toBeInTheDocument();
    expect(screen.getByText("Vas a dejar de recibir los mails de leads nuevos.")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Dejar de recibirlos" }));
    expect(api.post).toHaveBeenCalledWith("/notifications/unsubscribe", { token: "abc", scope: "NEW_LEAD" });
    expect(
      await screen.findByText(
        "Listo, no te vamos a mandar más estos mails. Podés volver a activarlos desde Notificaciones en la app.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a Notificaciones" })).toHaveAttribute("href", "/app/notificaciones");
  });

  it("names the handoff mails and every mail", () => {
    const { unmount } = render(page("/avisos/baja?token=abc&scope=HANDOFF"));
    expect(screen.getByText(/conversaciones que el agente pasa a una persona/)).toBeInTheDocument();
    unmount();
    render(page("/avisos/baja?token=abc&scope=ALL"));
    expect(screen.getByText("Vas a dejar de recibir todos los mails de avisos de BoxLead.")).toBeInTheDocument();
  });

  it("lets the person try again when the request fails", async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error("offline"));
    render(page("/avisos/baja?token=abc&scope=ALL"));
    await userEvent.click(screen.getByRole("button", { name: "Dejar de recibirlos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos darte de baja");
    await userEvent.click(screen.getByRole("button", { name: "Dejar de recibirlos" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Listo");
  });

  it("explains a link without its token", () => {
    render(page("/avisos/baja"));
    expect(screen.getByText("A este enlace le falta una parte")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dejar de recibirlos" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a Notificaciones" })).toHaveAttribute("href", "/app/notificaciones");
  });
});
