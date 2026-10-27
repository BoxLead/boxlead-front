import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../../src/components/ui/ToastProvider";
import type { AdminMe, AdminRole } from "../../api/types";
import { SessionContext, type SessionValue } from "../../session/session";
import { json, mockFetch, type Reply } from "../../test/fetch";
import { addDays, endOfDay, todayInBuenosAires } from "./dates";
import { InvitationsScreen } from "./InvitationsScreen";
import type { DemoGrant, Invitation } from "./types";

const REASON = "Pedido del equipo comercial";

const OPEN: Invitation = {
  id: "i1",
  email: "nora@panaderia.com",
  status: "OPEN",
  demoDays: 30,
  expiresAt: "2030-01-10T02:59:59.999Z",
  resellerId: "r1",
  createdBy: "a1",
  createdAt: "2029-12-30T15:00:00Z",
  acceptedAt: null,
  acceptedUserId: null,
  revokedAt: null,
};

const ACCEPTED: Invitation = { ...OPEN, id: "i2", email: "lucia@estudio.com", status: "ACCEPTED", acceptedAt: "2029-12-31T15:00:00Z", acceptedUserId: "u2" };

const ACTIVE: DemoGrant = {
  id: "g1",
  userId: "u2",
  email: "lucia@estudio.com",
  invitationId: "i2",
  status: "ACTIVE",
  startsAt: "2029-12-31T15:00:00Z",
  endsAt: "2030-01-14T15:00:00Z",
  revokedAt: null,
};

const RESELLERS = { items: [{ id: "r1", displayName: "Agencia Norte", status: "ACTIVE" }], page: 0, size: 50, totalItems: 1 };

function pageOf<T>(items: T[]) {
  return json(200, { items, page: 0, size: 50, totalItems: items.length });
}

function session(roles: AdminRole[]): SessionValue {
  const me: AdminMe = {
    userId: "a1",
    email: "equipo@boxlead.app",
    roles,
    factorConfirmed: true,
    enrollmentOpenUntil: null,
    factorLockedUntil: null,
    adminSessionExpiresAt: null,
  };
  const noop = () => Promise.resolve();
  return {
    stage: { kind: "ready", me },
    connectionLost: false,
    reauthenticating: false,
    retry: noop,
    signIn: noop,
    confirmEnrollment: noop,
    openSession: noop,
    reauthenticate: noop,
    cancelReauthentication: () => undefined,
    signOut: noop,
  };
}

type Handler = (method: string, url: URL, body: Record<string, unknown>) => Reply | undefined;

function renderScreen(handler: Handler, path = "/invitaciones", roles: AdminRole[] = ["SUPPORT"]) {
  const calls = mockFetch((method, url, body) => {
    const reply = handler(method, url, (body ?? {}) as Record<string, unknown>);
    if (reply) return reply;
    if (url.pathname === "/admin/resellers") return json(200, RESELLERS);
    if (url.pathname === "/admin/invitations") return pageOf([OPEN, ACCEPTED]);
    if (url.pathname === "/admin/demo-grants") return pageOf([ACTIVE]);
    return json(404, { error: "Not found", message: "Not found" });
  });
  render(
    <MemoryRouter initialEntries={[path]}>
      <SessionContext.Provider value={session(roles)}>
        <ToastProvider>
          <InvitationsScreen />
        </ToastProvider>
      </SessionContext.Provider>
    </MemoryRouter>,
  );
  return calls;
}

function dialog() {
  const open = [...document.querySelectorAll("dialog")].filter((element) => element.querySelector("form, .dialog-form"));
  const last = open.at(-1);
  if (!last) throw new Error("No dialog is open");
  return within(last);
}

function hidden(name: string | RegExp) {
  return dialog().getByRole("button", { name, hidden: true });
}

async function giveReason(confirm: string) {
  await userEvent.type(dialog().getByLabelText("Motivo"), REASON);
  await userEvent.click(hidden(confirm));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("InvitationsScreen", () => {
  it("lists invitations with their status, reseller and the action that applies", async () => {
    renderScreen(() => undefined);
    const row = (await screen.findByRole("cell", { name: "nora@panaderia.com" })).closest("tr");
    expect(row).not.toBeNull();
    const cells = within(row as HTMLElement);
    expect(cells.getByText("Abierta")).toBeInTheDocument();
    expect(cells.getByText("30 días")).toBeInTheDocument();
    expect(await cells.findByText("Agencia Norte")).toBeInTheDocument();
    expect(cells.getByRole("button", { name: "Revocar" })).toBeInTheDocument();
    const accepted = within(screen.getByRole("cell", { name: "lucia@estudio.com" }).closest("tr") as HTMLElement);
    expect(accepted.getByText("Aceptada")).toBeInTheDocument();
    expect(accepted.getByRole("link", { name: "Ver usuario" })).toHaveAttribute("href", "/usuarios/u2");
    expect(accepted.queryByRole("button", { name: "Revocar" })).toBeNull();
  });

  it("revokes an invitation with a reason and loads the list again", async () => {
    let revoked = false;
    const calls = renderScreen((method, url) => {
      if (method === "POST" && url.pathname === "/admin/invitations/i1/revoke") {
        revoked = true;
        return json(200, {});
      }
      if (url.pathname === "/admin/invitations" && revoked) return pageOf([{ ...OPEN, status: "REVOKED", revokedAt: "2030-01-01T15:00:00Z" }]);
      return undefined;
    });
    await userEvent.click(await screen.findByRole("button", { name: "Revocar" }));
    await giveReason("Revocar");
    const post = calls.find((call) => call.method === "POST");
    expect(JSON.parse(String(post?.init.body))).toEqual({ reason: REASON });
    expect(await screen.findByText("Revocada", { selector: ".tag" })).toBeInTheDocument();
    expect(screen.getByText("Revocaste la invitación de nora@panaderia.com.")).toBeInTheDocument();
  });

  it("checks the fields, creates the invitation and shows the link once", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const day = addDays(todayInBuenosAires(), 7);
    const calls = renderScreen((method, url) =>
      method === "POST" && url.pathname === "/admin/invitations" ? json(201, { id: "i9", link: "https://boxlead.app/invitacion#secreto" }) : undefined,
    );
    await screen.findByRole("cell", { name: "nora@panaderia.com" });
    await userEvent.click(screen.getByRole("button", { name: "Nueva invitación" }));
    await userEvent.click(hidden("Continuar"));
    expect(screen.getByText("Escribí el email de la persona.")).toBeInTheDocument();
    expect(screen.getByText("Elegí un día.")).toBeInTheDocument();
    await userEvent.type(dialog().getByLabelText("Email"), "pablo@talleres.com");
    await userEvent.type(dialog().getByLabelText("La invitación vence el"), day);
    await userEvent.type(dialog().getByLabelText("Días de Demo"), "400");
    await userEvent.click(hidden("Continuar"));
    expect(screen.getByText("Poné un número de días entre 1 y 365.")).toBeInTheDocument();
    await userEvent.clear(dialog().getByLabelText("Días de Demo"));
    await userEvent.selectOptions(dialog().getByLabelText("Revendedor"), "r1");
    await userEvent.click(hidden("Continuar"));
    expect(screen.getByText("La duración del plan Demo")).toBeInTheDocument();
    expect(screen.getByText("Agencia Norte", { selector: "dd" })).toBeInTheDocument();
    await giveReason("Crear invitación");

    const post = calls.find((call) => call.method === "POST");
    expect(JSON.parse(String(post?.init.body))).toEqual({
      email: "pablo@talleres.com",
      expiresAt: endOfDay(day),
      demoDays: null,
      resellerId: "r1",
      reason: REASON,
    });
    const field = await screen.findByLabelText("Link de la invitación", { selector: "input" });
    expect(field).toHaveValue("https://boxlead.app/invitacion#secreto");
    expect(screen.getByText("Este link no se vuelve a ver")).toBeInTheDocument();
    await userEvent.click(hidden("Copiar link"));
    expect(writeText).toHaveBeenCalledWith("https://boxlead.app/invitacion#secreto");
    expect(await screen.findByText("Copiaste el link.")).toBeInTheDocument();
    await userEvent.click(hidden("Listo"));
    expect(screen.queryByDisplayValue("https://boxlead.app/invitacion#secreto")).toBeNull();
    expect(document.body.innerHTML).not.toContain("secreto");
  });

  it("says the invitation goes by email when core returns no link", async () => {
    const day = addDays(todayInBuenosAires(), 3);
    renderScreen((method, url) => (method === "POST" && url.pathname === "/admin/invitations" ? json(201, { id: "i9", link: null }) : undefined));
    await screen.findByRole("cell", { name: "nora@panaderia.com" });
    await userEvent.click(screen.getByRole("button", { name: "Nueva invitación" }));
    await userEvent.type(dialog().getByLabelText("Email"), "pablo@talleres.com");
    await userEvent.type(dialog().getByLabelText("La invitación vence el"), day);
    await userEvent.click(hidden("Continuar"));
    await giveReason("Crear invitación");
    expect(await screen.findByText("Creamos la invitación. Le llega por email a pablo@talleres.com.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Link de la invitación")).toBeNull();
  });

  it("keeps the dialog open when the email already has an open invitation", async () => {
    const day = addDays(todayInBuenosAires(), 3);
    renderScreen((method, url) =>
      method === "POST" && url.pathname === "/admin/invitations"
        ? json(409, { error: "Conflict", message: "open", code: "INVITATION_ALREADY_OPEN" })
        : undefined,
    );
    await screen.findByRole("cell", { name: "nora@panaderia.com" });
    await userEvent.click(screen.getByRole("button", { name: "Nueva invitación" }));
    await userEvent.type(dialog().getByLabelText("Email"), "nora@panaderia.com");
    await userEvent.type(dialog().getByLabelText("La invitación vence el"), day);
    await userEvent.click(hidden("Continuar"));
    await giveReason("Crear invitación");
    expect(await screen.findByText("Ese email ya tiene una invitación abierta.")).toBeInTheDocument();
  });

  it("filters invitations by status and email", async () => {
    const calls = renderScreen(() => undefined);
    await screen.findByRole("cell", { name: "nora@panaderia.com" });
    await userEvent.selectOptions(screen.getByLabelText("Estado"), "EXPIRED");
    await userEvent.type(screen.getByLabelText("Email"), "nora{Enter}");
    await screen.findByRole("cell", { name: "nora@panaderia.com" });
    const last = calls.filter((call) => call.url.pathname === "/admin/invitations").at(-1);
    expect(last?.url.search).toBe("?status=EXPIRED&email=nora");
  });

  it("grants a Demo to a user found by the search", async () => {
    const calls = renderScreen((method, url) => {
      if (url.pathname === "/admin/customers") {
        return pageOf([{ id: "u7", email: "martin@ferreteria.com", name: "Martín", legalName: null, createdAt: "2029-01-01T00:00:00Z", planCode: null, subscriptionStatus: null }]);
      }
      if (method === "POST" && url.pathname === "/admin/customers/u7/demo") return json(201, {});
      return undefined;
    }, "/invitaciones?vista=demos");
    await screen.findByRole("link", { name: "lucia@estudio.com" });
    await userEvent.click(screen.getByRole("button", { name: "Otorgar Demo" }));
    await userEvent.click(hidden("Continuar"));
    expect(screen.getByText("Buscá y elegí un usuario.")).toBeInTheDocument();
    await userEvent.type(dialog().getByLabelText("Buscar usuario"), "martin{Enter}");
    await userEvent.click(await screen.findByRole("radio", { name: /martin@ferreteria.com/, hidden: true }));
    await userEvent.type(dialog().getByLabelText("Días de Demo"), "10");
    await userEvent.click(hidden("Continuar"));
    expect(screen.getByText("10 días")).toBeInTheDocument();
    await giveReason("Otorgar Demo");
    const search = calls.find((call) => call.url.pathname === "/admin/customers");
    expect(search?.url.search).toBe("?query=martin");
    const post = calls.find((call) => call.method === "POST");
    expect(JSON.parse(String(post?.init.body))).toEqual({ demoDays: 10, reason: REASON });
    expect(await screen.findByText("Le otorgaste una Demo a martin@ferreteria.com.")).toBeInTheDocument();
  });

  it("explains that a user can only have one Demo", async () => {
    renderScreen((method, url) => {
      if (url.pathname === "/admin/customers") {
        return pageOf([{ id: "u2", email: "lucia@estudio.com", name: null, legalName: "Estudio SRL", createdAt: "2029-01-01T00:00:00Z", planCode: "DEMO", subscriptionStatus: null }]);
      }
      if (method === "POST") return json(409, { error: "Conflict", message: "used", code: "DEMO_ALREADY_USED" });
      return undefined;
    }, "/invitaciones?vista=demos");
    await screen.findByRole("link", { name: "lucia@estudio.com" });
    await userEvent.click(screen.getByRole("button", { name: "Otorgar Demo" }));
    await userEvent.type(dialog().getByLabelText("Buscar usuario"), "lucia");
    await userEvent.click(hidden("Buscar"));
    expect(await screen.findByText("Estudio SRL · Plan Demo")).toBeInTheDocument();
    await userEvent.click(dialog().getByRole("radio", { hidden: true }));
    await userEvent.click(hidden("Continuar"));
    await giveReason("Otorgar Demo");
    expect(await screen.findByText(/Ese usuario ya tiene una Demo/)).toBeInTheDocument();
  });

  it("extends a Demo to a later day and takes one away", async () => {
    const calls = renderScreen((method) => (method === "POST" ? json(200, {}) : undefined), "/invitaciones?vista=demos");
    await screen.findByRole("link", { name: "lucia@estudio.com" });
    await userEvent.click(screen.getByRole("button", { name: "Extender" }));
    await userEvent.type(dialog().getByLabelText("Nuevo fin"), "2030-01-10");
    await userEvent.click(hidden("Continuar"));
    expect(screen.getByText("Elegí un día posterior al fin actual.")).toBeInTheDocument();
    await userEvent.clear(dialog().getByLabelText("Nuevo fin"));
    await userEvent.type(dialog().getByLabelText("Nuevo fin"), "2030-02-01");
    await userEvent.click(hidden("Continuar"));
    await giveReason("Extender");
    const extend = calls.find((call) => call.url.pathname === "/admin/customers/u2/demo/extend");
    expect(JSON.parse(String(extend?.init.body))).toEqual({ endsAt: endOfDay("2030-02-01"), reason: REASON });

    await userEvent.click(await screen.findByRole("button", { name: "Quitar" }));
    await giveReason("Quitar Demo");
    const revoke = calls.find((call) => call.url.pathname === "/admin/customers/u2/demo/revoke");
    expect(JSON.parse(String(revoke?.init.body))).toEqual({ reason: REASON });
  });

  it("shows the empty and error states of each list", async () => {
    let fail = true;
    renderScreen((_method, url) => {
      if (url.pathname === "/admin/invitations") return pageOf([]);
      if (url.pathname === "/admin/demo-grants") {
        if (fail) {
          fail = false;
          return json(500, { error: "Internal", message: "boom" });
        }
        return pageOf([]);
      }
      return undefined;
    });
    expect(await screen.findByText("Todavía no hay invitaciones")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Demos" }));
    expect(await screen.findByText("No pudimos cargar la lista")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Todavía no hay Demos")).toBeInTheDocument();
  });

  it("hides every action from a role that can not act", async () => {
    renderScreen(() => undefined, "/invitaciones", ["FINANCE"]);
    await screen.findByRole("cell", { name: "nora@panaderia.com" });
    expect(screen.queryByRole("button", { name: "Nueva invitación" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Revocar" })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Acciones" })).toBeNull();
  });
});
