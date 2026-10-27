import { createContext, useContext, useEffect } from "react";
import type { Reseller } from "../areas/referrals/types";

export type DirectoryStatus = "loading" | "error" | "ready";

export type DirectoryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; resellers: Reseller[] };

export type DirectoryValue = {
  state: DirectoryState;
  load: () => void;
  invalidate: () => void;
};

export type ResellerDirectory = {
  status: DirectoryStatus;
  message: string | null;
  resellers: Reseller[];
  find: (id: string) => Reseller | undefined;
  nameOf: (id: string) => string;
  reload: () => void;
  invalidate: () => void;
};

const NO_RESELLERS: Reseller[] = [];

export const ResellerDirectoryContext = createContext<DirectoryValue | null>(null);

export function shortReseller(id: string): string {
  return `Revendedor ${id.slice(0, 8)}`;
}

export function useResellerDirectory(): ResellerDirectory {
  const value = useContext(ResellerDirectoryContext);
  if (!value) throw new Error("useResellerDirectory needs a ResellerDirectoryProvider");
  const { state, load, invalidate } = value;

  useEffect(() => {
    if (state.status === "idle") load();
  }, [state.status, load]);

  const resellers = state.status === "ready" ? state.resellers : NO_RESELLERS;
  const find = (id: string) => resellers.find((reseller) => reseller.id === id);
  return {
    status: state.status === "idle" ? "loading" : state.status,
    message: state.status === "error" ? state.message : null,
    resellers,
    find,
    nameOf: (id) => find(id)?.displayName ?? shortReseller(id),
    reload: load,
    invalidate,
  };
}
