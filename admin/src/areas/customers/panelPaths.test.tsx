/// <reference types="node" />
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../../src/components/ui/ToastProvider";
import { SessionContext, type SessionValue } from "../../session/session";
import { json, mockFetch } from "../../test/fetch";
import { DemoPanel } from "./DemoPanel";

const HERE = dirname(fileURLToPath(import.meta.url));
const ODD_ID = "a/../../admin/grants?x=1#y";

function session(): SessionValue {
  const noop = () => Promise.resolve();
  return {
    stage: {
      kind: "ready",
      me: {
        userId: "admin",
        email: "equipo@boxlead.app",
        roles: ["OWNER"],
        factorConfirmed: true,
        enrollmentOpenUntil: null,
        factorLockedUntil: null,
        adminSessionExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      },
    },
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("customer panel paths", () => {
  it("encodes the user id as one path segment", async () => {
    const calls = mockFetch(() => json(204));
    const demo = {
      id: "d1",
      userId: ODD_ID,
      invitationId: null,
      planVersionId: "p1",
      startsAt: "2026-11-01T12:00:00Z",
      endsAt: "2099-11-01T12:00:00Z",
      revokedAt: null,
    };
    render(
      <SessionContext.Provider value={session()}>
        <ToastProvider closeLabel="Cerrar aviso">
          <MemoryRouter>
            <DemoPanel userId={ODD_ID} demo={demo} canOperate onChanged={() => undefined} />
          </MemoryRouter>
        </ToastProvider>
      </SessionContext.Provider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Quitar Demo" }));
    const dialog = screen.getByRole("heading", { name: "Quitar Demo", hidden: true }).closest("dialog");
    if (!dialog) throw new Error("No dialog");
    await userEvent.type(within(dialog).getByLabelText("Motivo"), "Lo pidió el cliente por mail");
    await userEvent.click(within(dialog).getByRole("button", { name: "Quitar Demo", hidden: true }));
    await vi.waitFor(() => expect(calls.some((call) => call.method === "POST")).toBe(true));
    const post = calls.find((call) => call.method === "POST");
    expect(post?.url.pathname).toBe(`/admin/customers/${encodeURIComponent(ODD_ID)}/demo/revoke`);
    expect(post?.url.search).toBe("");
  });

  it("never puts a raw user id in an admin path", () => {
    for (const file of ["AttributionPanel.tsx", "DemoPanel.tsx", "LimitsPanel.tsx", "SubscriptionPanel.tsx"]) {
      expect(readFileSync(join(HERE, file), "utf8"), file).not.toMatch(/\/admin\/customers\/\$\{userId\}/);
    }
  });
});
