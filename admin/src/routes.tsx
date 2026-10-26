import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { navItem, type ScreenId } from "./nav";
import type { Access } from "./session/roles";

export type AdminRoute = {
  path: string;
  access: Access;
  Screen: LazyExoticComponent<ComponentType>;
};

function screen<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K): LazyExoticComponent<ComponentType> {
  return lazy(() => load().then((module) => ({ default: module[name] })));
}

function route(id: ScreenId, Screen: LazyExoticComponent<ComponentType>, path = navItem(id).path): AdminRoute {
  return { path, access: navItem(id).access, Screen };
}

export const ROUTES: AdminRoute[] = [
  route("overview", screen(() => import("./areas/customers/OverviewScreen"), "OverviewScreen")),
  route("customers", screen(() => import("./areas/customers/CustomersScreen"), "CustomersScreen")),
  route("customers", screen(() => import("./areas/customers/CustomerDetailScreen"), "CustomerDetailScreen"), "/usuarios/:userId"),
  route("subscriptions", screen(() => import("./areas/billing/SubscriptionsScreen"), "SubscriptionsScreen")),
  route("payments", screen(() => import("./areas/billing/PaymentsScreen"), "PaymentsScreen")),
  route("refunds", screen(() => import("./areas/billing/RefundsScreen"), "RefundsScreen")),
  route("invoices", screen(() => import("./areas/billing/InvoicesScreen"), "InvoicesScreen")),
  route("invitations", screen(() => import("./areas/invitations/InvitationsScreen"), "InvitationsScreen")),
  route("resellers", screen(() => import("./areas/referrals/ResellersScreen"), "ResellersScreen")),
  route("resellers", screen(() => import("./areas/referrals/ResellerDetailScreen"), "ResellerDetailScreen"), "/revendedores/:resellerId"),
  route("commissions", screen(() => import("./areas/referrals/CommissionsScreen"), "CommissionsScreen")),
  route("payouts", screen(() => import("./areas/referrals/PayoutsScreen"), "PayoutsScreen")),
  route("payouts", screen(() => import("./areas/referrals/PayoutDetailScreen"), "PayoutDetailScreen"), "/liquidaciones/:payoutId"),
  route("usage", screen(() => import("./areas/operations/UsageScreen"), "UsageScreen")),
  route("consumer-requests", screen(() => import("./areas/operations/ConsumerRequestsScreen"), "ConsumerRequestsScreen")),
  route("team", screen(() => import("./areas/operations/TeamScreen"), "TeamScreen")),
  route("audit", screen(() => import("./areas/operations/AuditScreen"), "AuditScreen")),
];
