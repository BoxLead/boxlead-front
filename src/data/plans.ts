import { api, ApiError } from "../api/client";
import type { BillingPlan, Invitation, PaidPlanCode, PlanCode } from "../api/types";
import { safeAppPath } from "../util/redirect";
import { signupLegal, type SignupLegal } from "../util/legalAcceptance";

export const PLAN_PARAM = "plan";
export const PLANS_PATH = "/billing/plans";
export const CURRENT_INVITATION_PATH = "/invitations/current";
export const LEGAL_DOCUMENTS_PATH = "/legal/documents";
export const SIGNUP_OPTIONS_TIMEOUT_MS = 5000;

const PLAN_CODES: readonly PlanCode[] = ["DEMO", "STARTER", "BUSINESS", "ENTERPRISE"];
const PAID_PLAN_CODES: readonly PaidPlanCode[] = ["STARTER", "BUSINESS"];

export type SignupChoice = PaidPlanCode | "DEMO";

export type InvitationCheck =
  | { status: "valid"; invitation: Invitation }
  | { status: "none" }
  | { status: "error" };

export type PaidPlan = BillingPlan & { code: PaidPlanCode };

export type SignupPlans = {
  paid: PaidPlan[];
  beta: BillingPlan | null;
  contact: BillingPlan[];
};

export type SignupOptions = {
  plans: SignupPlans | null;
  invitation: InvitationCheck;
  legal: SignupLegal | null;
};

export const SIGNUP_OPTIONS_OFF: SignupOptions = {
  plans: null,
  invitation: { status: "none" },
  legal: null,
};

export function isPaidPlan(value: unknown): value is PaidPlanCode {
  return PAID_PLAN_CODES.some((code) => code === value);
}

function isPlan(item: unknown): item is BillingPlan {
  return (
    typeof item === "object" &&
    item !== null &&
    "code" in item &&
    "name" in item &&
    PLAN_CODES.some((code) => code === item.code) &&
    typeof item.name === "string"
  );
}

function isPickablePaidPlan(plan: BillingPlan): plan is PaidPlan {
  return isPaidPlan(plan.code) && !plan.contactOnly && !plan.inviteOnly && Boolean(plan.chargeToday ?? plan.price);
}

export function signupPlans(value: unknown): SignupPlans | null {
  if (!Array.isArray(value)) return null;
  const plans = value.filter(isPlan);
  return {
    paid: plans.filter(isPickablePaidPlan),
    beta: plans.find((plan) => plan.code === "DEMO" && plan.inviteOnly) ?? null,
    contact: plans.filter((plan) => plan.contactOnly === true),
  };
}

export function hasChoices(plans: SignupPlans): boolean {
  return plans.paid.length > 0 || plans.beta !== null;
}

function readInvitation(value: unknown): Invitation | null {
  if (typeof value !== "object" || value === null || !("email" in value) || !("expiresAt" in value)) return null;
  const { email, expiresAt } = value;
  return typeof email === "string" && email.includes("@") && typeof expiresAt === "string" ? { email, expiresAt } : null;
}

export function choiceFromQuery(
  value: string | null,
  plans: SignupPlans,
  invitation: InvitationCheck,
): SignupChoice | null {
  const code = value?.trim().toUpperCase();
  if (isPaidPlan(code) && plans.paid.some((plan) => plan.code === code)) return code;
  if (code === "DEMO" && plans.beta && invitation.status === "valid") return "DEMO";
  if (!code && plans.beta && invitation.status === "valid") return "DEMO";
  return null;
}

export function signupDestination(choice: SignupChoice | null, next: string): string {
  if (isPaidPlan(choice)) return safeAppPath(`/app/billing?checkout=${choice}`) ?? next;
  return next;
}

function timeout<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

async function loadPlans(): Promise<SignupPlans | null> {
  try {
    return signupPlans(await api.get<unknown>(PLANS_PATH));
  } catch {
    return null;
  }
}

async function loadInvitation(): Promise<InvitationCheck> {
  try {
    const invitation = readInvitation(await api.get<unknown>(CURRENT_INVITATION_PATH));
    return invitation ? { status: "valid", invitation } : { status: "error" };
  } catch (e: unknown) {
    return e instanceof ApiError && e.status === 404 ? { status: "none" } : { status: "error" };
  }
}

async function loadLegal(): Promise<SignupLegal | null> {
  try {
    return signupLegal(await api.get<unknown>(LEGAL_DOCUMENTS_PATH));
  } catch {
    return null;
  }
}

export async function loadSignupOptions(timeoutMs = SIGNUP_OPTIONS_TIMEOUT_MS): Promise<SignupOptions> {
  const load = Promise.all([loadPlans(), loadInvitation(), loadLegal()]).then(
    ([plans, invitation, legal]): SignupOptions => ({ plans, invitation, legal }),
  );
  return Promise.race([load, timeout(timeoutMs, SIGNUP_OPTIONS_OFF)]);
}
