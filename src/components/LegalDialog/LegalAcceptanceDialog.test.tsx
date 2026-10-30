import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LegalDocument } from "../../api/types";
import { AuthContext, SESSION_FLAGS_OFF, type AuthContextValue } from "../../context/auth";
import { LEGAL_DOCUMENTS_KEY } from "../../data/billing";
import { clearQueryCache, setQueryFetcher } from "../../data/queryCache";
import { i18n } from "../../i18n";
import { LegalAcceptanceDialog } from "./LegalAcceptanceDialog";

const documents: LegalDocument[] = [
  { kind: "TERMS", version: "2026-11", language: "es", url: "/terminos", requiresAcceptance: true },
];

const auth: AuthContextValue = {
  ...SESSION_FLAGS_OFF,
  pendingLegal: [{ kind: "TERMS", version: "2026-11" }],
  user: null,
  login: vi.fn(),
  register: vi.fn(),
  socialLogin: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  isLoading: false,
  error: null,
  clearError: vi.fn(),
};

describe("LegalAcceptanceDialog", () => {
  afterEach(() => {
    setQueryFetcher(null);
    clearQueryCache();
  });

  it("asks to accept the new versions in English", async () => {
    await i18n.changeLanguage("en");
    setQueryFetcher((key: string) => (key === LEGAL_DOCUMENTS_KEY ? Promise.resolve(documents) : Promise.resolve([])));
    render(
      <AuthContext.Provider value={auth}>
        <LegalAcceptanceDialog />
      </AuthContext.Provider>,
    );
    expect(screen.getByRole("heading", { name: "We updated our documents", hidden: true })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Terms and conditions", hidden: true })).toHaveAttribute("href", "/terminos");
    expect(screen.getByText("Version 2026-11")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "I've read and accept these documents.", hidden: true })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Accept", hidden: true })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Log out", hidden: true })).toBeInTheDocument();
  });
});
