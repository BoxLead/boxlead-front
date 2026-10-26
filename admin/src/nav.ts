import type { Access } from "./session/roles";

export type ScreenId =
  | "overview"
  | "customers"
  | "subscriptions"
  | "payments"
  | "refunds"
  | "invoices"
  | "invitations"
  | "resellers"
  | "commissions"
  | "payouts"
  | "usage"
  | "consumer-requests"
  | "team"
  | "audit";

export type NavItem = {
  id: ScreenId;
  path: string;
  label: string;
  description: string;
  access: Access;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const NAV: NavSection[] = [
  {
    label: "Clientes",
    items: [
      { id: "overview", path: "/", label: "Inicio", description: "Cómo viene el mes en usuarios, suscripciones y pagos.", access: "ANY" },
      { id: "customers", path: "/usuarios", label: "Usuarios", description: "Buscá un cliente y mirá su plan, sus pagos y su Demo.", access: "ANY" },
    ],
  },
  {
    label: "Cobros",
    items: [
      { id: "subscriptions", path: "/suscripciones", label: "Suscripciones", description: "Suscripciones por estado, plan y período.", access: "ANY" },
      { id: "payments", path: "/pagos", label: "Pagos", description: "Pagos con su estado, su monto y su factura.", access: "ANY" },
      { id: "refunds", path: "/reembolsos", label: "Reembolsos", description: "Reembolsos pedidos y su respuesta de Mercado Pago.", access: ["FINANCE"] },
      { id: "invoices", path: "/facturas", label: "Facturas", description: "Facturas para emitir, emitidas y anuladas.", access: ["FINANCE"] },
    ],
  },
  {
    label: "Demo",
    items: [
      { id: "invitations", path: "/invitaciones", label: "Invitaciones y Demo", description: "Invitaciones abiertas y Demos vigentes.", access: ["SUPPORT"] },
    ],
  },
  {
    label: "Referidos",
    items: [
      { id: "resellers", path: "/revendedores", label: "Revendedores", description: "Revendedores con sus códigos y sus clientes.", access: "ANY" },
      { id: "commissions", path: "/comisiones", label: "Comisiones", description: "Comisiones por estado y revendedor.", access: ["FINANCE"] },
      { id: "payouts", path: "/liquidaciones", label: "Liquidaciones", description: "Liquidaciones armadas, exportadas y pagadas.", access: ["FINANCE"] },
    ],
  },
  {
    label: "Operación",
    items: [
      { id: "usage", path: "/uso", label: "Uso de IA", description: "Tokens y costo por usuario, día o modelo.", access: "ANY" },
      { id: "consumer-requests", path: "/pedidos", label: "Pedidos de consumo", description: "Pedidos de arrepentimiento y de baja.", access: "ANY" },
      { id: "team", path: "/equipo", label: "Equipo", description: "Personas con rol en el backoffice.", access: ["OWNER"] },
      { id: "audit", path: "/auditoria", label: "Auditoría", description: "Cada acción del equipo, de los clientes y del sistema.", access: ["OWNER"] },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV.flatMap((section) => section.items);

export function navItem(id: ScreenId): NavItem {
  const item = NAV_ITEMS.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown screen ${id}`);
  return item;
}
