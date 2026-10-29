import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../../src/components/ui/ToastProvider";
import type { AdminMe, AdminRole } from "../../api/types";
import { connectSession } from "../../api/client";
import { ResellerDirectoryProvider } from "../../session/ResellerDirectoryProvider";
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
          <ResellerDirectoryProvider>
            <InvitationsScreen />
          </ResellerDirectoryProvider>
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

  it("answers the second revoke of the same invitation with a conflict and loads the list again", async () => {
    let revokes = 0;
    const calls = renderScreen((method, url) => {
      if (method === "POST" && url.pathname === "/admin/invitations/i1/revoke") {
        revokes += 1;
        return revokes === 1 ? json(200, {}) : json(409, { error: "Conflict", message: "closed", code: "INVITATION_CLOSED" });
      }
      return undefined;
    });
    await userEvent.click(await screen.findByRole("button", { name: "Revocar" }));
    await giveReason("Revocar");
    expect(await screen.findByText("Revocaste la invitación de nora@panaderia.com.")).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "Revocar" }));
    const listed = calls.filter((call) => call.url.pathname === "/admin/invitations").length;
    await giveReason("Revocar");
    expect(await dialog().findByText("La invitación ya está cerrada.")).toBeInTheDocument();
    expect(revokes).toBe(2);
    await userEvent.click(hidden("Cancelar"));
    await vi.waitFor(() => expect(calls.filter((call) => call.url.pathname === "/admin/invitations").length).toBe(listed + 1));
  }, 15_000);

  it("loads the list again after closing a revoke that another admin already did", async () => {
    const calls = renderScreen((method, url) => {
      if (method === "POST" && url.pathname === "/admin/invitations/i1/revoke") {
        return json(409, { error: "Conflict", message: "closed", code: "INVITATION_CLOSED" });
      }
      return undefined;
    });
    await userEvent.click(await screen.findByRole("button", { name: "Revocar" }));
    const listed = calls.filter((call) => call.url.pathname === "/admin/invitations").length;
    await giveReason("Revocar");
    expect(await dialog().findByText("La invitación ya está cerrada.")).toBeInTheDocument();
    await userEvent.click(hidden("Cancelar"));
    await vi.waitFor(() => expect(calls.filter((call) => call.url.pathname === "/admin/invitations").length).toBe(listed + 1));
  });

  it("says when the Demo is already gone and loads the list again on close", async () => {
    const calls = renderScreen(
      (method, url) => {
        if (method === "POST" && url.pathname.endsWith("/demo/revoke")) return json(404, { error: "Not found", message: "No demo" });
        return undefined;
      },
      "/invitaciones?vista=demos",
    );
    await userEvent.click(await screen.findByRole("button", { name: "Quitar" }));
    const listed = calls.filter((call) => call.url.pathname === "/admin/demo-grants").length;
    await giveReason("Quitar Demo");
    expect(await dialog().findByText("Ese usuario ya no tiene Demo.")).toBeInTheDocument();
    await userEvent.click(hidden("Cancelar"));
    await vi.waitFor(() => expect(calls.filter((call) => call.url.pathname === "/admin/demo-grants").length).toBe(listed + 1));
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

  it("keeps the tabs locked while the session asks for the code in the middle of creating and until the link is closed", async () => {
    let answer: () => void = () => undefined;
    const disconnect = connectSession({
      adminSessionRequired: () => new Promise<void>((resolve) => (answer = resolve)),
      signedOut: () => undefined,
      connectionLost: () => undefined,
    });
    try {
      const day = addDays(todayInBuenosAires(), 3);
      let posts = 0;
      const calls = renderScreen((method, url) => {
        if (method !== "POST" || url.pathname !== "/admin/invitations") return undefined;
        posts += 1;
        if (posts === 1) return json(401, { error: "Unauthorized", message: "session", code: "ADMIN_SESSION_REQUIRED" });
        return json(201, { id: "i9", link: "https://boxlead.app/invitacion#secreto" });
      });
      await screen.findByRole("cell", { name: "nora@panaderia.com" });
      await userEvent.click(screen.getByRole("button", { name: "Nueva invitación" }));
      await userEvent.type(dialog().getByLabelText("Email"), "pablo@talleres.com");
      await userEvent.type(dialog().getByLabelText("La invitación vence el"), day);
      await userEvent.click(hidden("Continuar"));
      await giveReason("Crear invitación");
      await vi.waitFor(() => expect(posts).toBe(1));
      expect(screen.getByRole("button", { name: "Demos", hidden: true })).toBeDisabled();
      expect(hidden("Guardando…")).toBeDisabled();
      answer();
      expect(await screen.findByLabelText("Link de la invitación", { selector: "input" })).toHaveValue("https://boxlead.app/invitacion#secreto");
      const sent = calls.filter((call) => call.method === "POST");
      expect(sent).toHaveLength(2);
      expect(sent[1].init.body).toBe(sent[0].init.body);
      expect(screen.getByRole("button", { name: "Demos", hidden: true })).toBeDisabled();
      await userEvent.click(hidden("Listo"));
      await vi.waitFor(() => expect(screen.getByRole("button", { name: "Demos" })).toBeEnabled());
    } finally {
      disconnect();
    }
  }, 15_000);

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

  it("explains the codes and the field problems core answers when creating", async () => {
    const day = addDays(todayInBuenosAires(), 3);
    const replies = [
      json(400, { error: "past", message: "past", code: "INVITATION_EXPIRY_PAST" }),
      json(400, { error: "email", message: "email", code: "INVITATION_EMAIL_INVALID" }),
      json(409, { error: "reseller", message: "reseller", code: "INVITATION_RESELLER_INVALID" }),
      json(400, {
        error: "Validation failed",
        message: "Validation failed",
        fields: [
          { field: "email", message: "must be a well-formed email address" },
          { field: "reason", message: "size must be between 10 and 500" },
        ],
      }),
    ];
    renderScreen((method, url) => (method === "POST" && url.pathname === "/admin/invitations" ? replies.shift() : undefined));
    await screen.findByRole("cell", { name: "nora@panaderia.com" });
    await userEvent.click(screen.getByRole("button", { name: "Nueva invitación" }));
    await userEvent.type(dialog().getByLabelText("Email"), "pablo@talleres.com");
    await userEvent.type(dialog().getByLabelText("La invitación vence el"), day);
    await userEvent.click(hidden("Continuar"));
    await giveReason("Crear invitación");
    expect(await dialog().findByText("El vencimiento ya pasó. Elegí hoy o un día que todavía no pasó.")).toBeInTheDocument();
    await userEvent.click(hidden("Crear invitación"));
    expect(await dialog().findByText("Ese email no es válido. Revisalo y volvé a intentar.")).toBeInTheDocument();
    await userEvent.click(hidden("Crear invitación"));
    expect(await dialog().findByText(/Ese revendedor no existe o no está activo/)).toBeInTheDocument();
    await userEvent.click(hidden("Crear invitación"));
    expect(await dialog().findByText("Revisá el email. El motivo tiene que tener entre 10 y 500 caracteres.")).toBeInTheDocument();
  }, 15_000);

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
        return pageOf([{ id: "u7", email: "martin@ferreteria.com", name: "Martín", legalName: null, createdAt: "2029-01-01T00:00:00Z", planCode: null, planSource: "NONE", subscriptionStatus: null }]);
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
        return pageOf([{ id: "u2", email: "lucia@estudio.com", name: null, legalName: "Estudio SRL", createdAt: "2029-01-01T00:00:00Z", planCode: "DEMO", planSource: "DEMO", subscriptionStatus: null }]);
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

  it("warns that a live subscription wins over the Demo and shows the refusal", async () => {
    renderScreen((method, url) => {
      if (url.pathname === "/admin/customers") {
        return pageOf([{ id: "u8", email: "diego@agencia.com", name: "Diego", legalName: null, createdAt: "2029-01-01T00:00:00Z", planCode: "STARTER", planSource: "SUBSCRIPTION", subscriptionStatus: "PAST_DUE" }]);
      }
      if (method === "POST") return json(409, { error: "Conflict", message: "live", code: "DEMO_SUBSCRIPTION_ACTIVE" });
      return undefined;
    }, "/invitaciones?vista=demos");
    await screen.findByRole("link", { name: "lucia@estudio.com" });
    await userEvent.click(screen.getByRole("button", { name: "Otorgar Demo" }));
    await userEvent.type(dialog().getByLabelText("Buscar usuario"), "diego{Enter}");
    await userEvent.click(await screen.findByRole("radio", { name: /diego@agencia.com/, hidden: true }));
    await userEvent.click(hidden("Continuar"));
    expect(dialog().getByText("Tiene una suscripción que le da acceso")).toBeInTheDocument();
    expect(dialog().getByText("Plan Starter · Cuota impaga")).toBeInTheDocument();
    await giveReason("Otorgar Demo");
    expect(await dialog().findByText(/Ese usuario tiene una suscripción que le da acceso/)).toBeInTheDocument();
  }, 15_000);

  it("warns that a team member gets no Demo and shows the refusal", async () => {
    renderScreen((method, url) => {
      if (url.pathname === "/admin/customers") {
        return pageOf([{ id: "u9", email: "pablo@boxlead.app", name: "Pablo", legalName: null, createdAt: "2029-01-01T00:00:00Z", planCode: "BUSINESS", planSource: "TEAM", subscriptionStatus: null }]);
      }
      if (method === "POST") return json(409, { error: "Conflict", message: "team", code: "DEMO_TEAM_MEMBER" });
      return undefined;
    }, "/invitaciones?vista=demos");
    await screen.findByRole("link", { name: "lucia@estudio.com" });
    await userEvent.click(screen.getByRole("button", { name: "Otorgar Demo" }));
    await userEvent.type(dialog().getByLabelText("Buscar usuario"), "pablo{Enter}");
    const option = await screen.findByRole("radio", { name: /pablo@boxlead.app/, hidden: true });
    expect(option.closest("label")).toHaveTextContent("Pablo · Equipo");
    await userEvent.click(option);
    await userEvent.click(hidden("Continuar"));
    expect(dialog().getByText("Es del equipo de BoxLead")).toBeInTheDocument();
    expect(dialog().getByText("Equipo, con los límites de Business")).toBeInTheDocument();
    expect(dialog().queryByText("Tiene una suscripción que le da acceso")).toBeNull();
    await giveReason("Otorgar Demo");
    expect(await dialog().findByText(/Esa persona es del equipo y ya usa BoxLead sin pagar/)).toBeInTheDocument();
  }, 15_000);

  it("does not warn when the subscription no longer gives access", async () => {
    renderScreen((_method, url) => {
      if (url.pathname === "/admin/customers") {
        return pageOf([{ id: "u8", email: "diego@agencia.com", name: "Diego", legalName: null, createdAt: "2029-01-01T00:00:00Z", planCode: null, planSource: "NONE", subscriptionStatus: "CANCELED" }]);
      }
      return undefined;
    }, "/invitaciones?vista=demos");
    await screen.findByRole("link", { name: "lucia@estudio.com" });
    await userEvent.click(screen.getByRole("button", { name: "Otorgar Demo" }));
    await userEvent.type(dialog().getByLabelText("Buscar usuario"), "diego{Enter}");
    await userEvent.click(await screen.findByRole("radio", { name: /diego@agencia.com/, hidden: true }));
    await userEvent.click(hidden("Continuar"));
    expect(dialog().getByLabelText("Motivo")).toBeInTheDocument();
    expect(dialog().queryByText("Tiene una suscripción que le da acceso")).toBeNull();
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

  it("explains that the Demo of a team member can not be extended", async () => {
    renderScreen((method) => (method === "POST" ? json(409, { error: "team", message: "team", code: "DEMO_TEAM_MEMBER" }) : undefined), "/invitaciones?vista=demos");
    await screen.findByRole("link", { name: "lucia@estudio.com" });
    await userEvent.click(screen.getByRole("button", { name: "Extender" }));
    await userEvent.type(dialog().getByLabelText("Nuevo fin"), "2030-02-01");
    await userEvent.click(hidden("Continuar"));
    await giveReason("Extender");
    expect(await dialog().findByText(/Esa persona es del equipo y ya usa BoxLead sin pagar/)).toBeInTheDocument();
  });

  it("sends the last moment of the chosen day in Buenos Aires, which core still accepts on day 365", () => {
    expect(endOfDay("2030-02-01")).toBe("2030-02-02T02:59:59.999Z");
    expect(Date.parse(endOfDay(addDays(todayInBuenosAires(), 365)))).toBeLessThan(Date.parse(`${addDays(todayInBuenosAires(), 366)}T00:00:00-03:00`));
  });

  it("shows the hour a Demo starts and ends and explains how to take away one that ended", async () => {
    const ended: DemoGrant = { ...ACTIVE, id: "g2", userId: "u3", email: "martin@ferreteria.com", invitationId: null, status: "ENDED", startsAt: "2029-12-01T13:00:00Z", endsAt: "2029-12-15T13:00:00Z" };
    renderScreen((_method, url) => (url.pathname === "/admin/demo-grants" ? pageOf([ACTIVE, ended]) : undefined), "/invitaciones?vista=demos");
    const row = within((await screen.findByRole("link", { name: "martin@ferreteria.com" })).closest("tr") as HTMLElement);
    expect(row.getByText(/1 dic 2029, 10:00/)).toBeInTheDocument();
    expect(row.getByText(/15 dic 2029, 10:00/)).toBeInTheDocument();
    await userEvent.click(row.getByRole("button", { name: "Extender" }));
    expect(dialog().getByText(/La Demo de martin@ferreteria.com terminó el 15 dic 2029, 10:00/)).toBeInTheDocument();
    await userEvent.click(hidden("Cancelar"));
    await userEvent.click(row.getByRole("button", { name: "Quitar" }));
    expect(dialog().getByText(/ya terminó. Quitarla no cambia su plan y deja lugar para otorgarle otra/)).toBeInTheDocument();
    expect(dialog().queryByText(/se queda sin plan desde ahora/)).toBeNull();
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
    expect(screen.getByText(/Una invitación es para quien todavía no tiene cuenta/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Demos" }));
    expect(await screen.findByText("No pudimos cargar la lista")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Todavía no hay Demos")).toBeInTheDocument();
    expect(screen.getByText(/Una Demo otorgada es para quien ya tiene cuenta y arranca en el acto/)).toBeInTheDocument();
  });

  it("hides every action from a role that can not act", async () => {
    renderScreen(() => undefined, "/invitaciones", ["FINANCE"]);
    await screen.findByRole("cell", { name: "nora@panaderia.com" });
    expect(screen.queryByRole("button", { name: "Nueva invitación" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Revocar" })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Acciones" })).toBeNull();
  });
});
