export type AdminErrorCode =
  | "ADMIN_SESSION_REQUIRED"
  | "ROLE_REQUIRED"
  | "ADMIN_SELF_OPERATION"
  | "MFA_LOCKED"
  | "MFA_INVALID"
  | "REFUND_EXCEEDS_PAYMENT"
  | "COMMISSION_NOT_RELEASABLE"
  | "INVITATION_ALREADY_OPEN"
  | "INVITATION_CLOSED"
  | "INVITATION_RESELLER_INVALID"
  | "DEMO_ALREADY_USED"
  | "DEMO_SUBSCRIPTION_ACTIVE"
  | "INVITATION_EXPIRY_PAST"
  | "INVITATION_EMAIL_INVALID"
  | "SUBSCRIPTION_NOT_ACTIVE"
  | "RESELLER_EXISTS"
  | "INVOICE_NUMBER_TAKEN"
  | "PAYOUT_NOTHING_TO_PAY"
  | "PAYOUT_MIXED_CURRENCIES"
  | "PAYOUT_NOT_POSITIVE"
  | "COMMISSION_NOTHING_TO_REVERSE"
  | "CONCURRENT_CHANGE";

const CODE_MESSAGES: Record<AdminErrorCode, string> = {
  ADMIN_SESSION_REQUIRED: "Tu sesión de administración venció. Ingresá un código nuevo para seguir.",
  ROLE_REQUIRED: "Tu rol no permite hacer esto.",
  ADMIN_SELF_OPERATION: "No podés operar sobre tu propia cuenta.",
  MFA_LOCKED: "Hubo demasiados códigos incorrectos y el factor quedó bloqueado por un rato.",
  MFA_INVALID: "El código no es válido. Revisá que la hora del teléfono esté bien y probá con el próximo.",
  REFUND_EXCEEDS_PAYMENT: "El reembolso supera lo que queda del pago.",
  COMMISSION_NOT_RELEASABLE: "Esa comisión todavía no se puede liberar.",
  INVITATION_ALREADY_OPEN: "Ese email ya tiene una invitación abierta.",
  INVITATION_CLOSED: "La invitación ya está cerrada.",
  INVITATION_RESELLER_INVALID: "Ese revendedor no existe o no está activo. Elegí otro o creá la invitación sin revendedor.",
  DEMO_ALREADY_USED: "Ese usuario ya tiene una Demo, aunque haya terminado. Quitala antes de otorgarle otra.",
  DEMO_SUBSCRIPTION_ACTIVE: "Ese usuario tiene una suscripción que le da acceso. La Demo no tendría efecto y gastaría la única que puede tener.",
  INVITATION_EXPIRY_PAST: "El vencimiento ya pasó. Elegí hoy o un día que todavía no pasó.",
  INVITATION_EMAIL_INVALID: "Ese email no es válido. Revisalo y volvé a intentar.",
  SUBSCRIPTION_NOT_ACTIVE: "Esa suscripción ya no está activa, así que esta acción no aplica. Recargá para ver lo último.",
  RESELLER_EXISTS: "Ese usuario ya es revendedor.",
  INVOICE_NUMBER_TAKEN: "Ese número de factura ya está usado en otra factura. Revisalo y cargá el correcto.",
  PAYOUT_NOTHING_TO_PAY: "Ese revendedor no tiene comisiones aprobadas para liquidar en ese período.",
  PAYOUT_MIXED_CURRENCIES: "Las comisiones aprobadas están en más de una moneda y una liquidación lleva una sola. Armá una por moneda.",
  PAYOUT_NOT_POSITIVE: "El total de la liquidación no es positivo. Revisá las reversas antes de armarla.",
  COMMISSION_NOTHING_TO_REVERSE: "Esa comisión ya fue revertida y no queda nada por revertir.",
  CONCURRENT_CHANGE: "Otra persona cambió esto al mismo tiempo. Recargá para ver lo último y volvé a intentar.",
};

const STATUS_MESSAGES: Record<number, string> = {
  400: "Revisá los datos e intentá de nuevo.",
  401: "Tu sesión se cerró. Volvé a entrar.",
  403: "No tenés permiso para hacer esto.",
  404: "No encontramos lo que buscabas.",
  409: "El estado cambió y esta acción ya no aplica. Recargá para ver lo último.",
  429: "Hiciste demasiados intentos seguidos. Probá de nuevo en un rato.",
};

const FALLBACK = "Algo falló en BoxLead. Probá de nuevo en unos minutos.";

export type FieldProblem = { field: string; message: string };

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly fields: readonly FieldProblem[];

  constructor(message: string, status: number, code: string | null, fields: readonly FieldProblem[] = []) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export class ConnectionLostError extends Error {
  constructor() {
    super("Se cortó la conexión con BoxLead. Recargá la página para seguir.");
    this.name = "ConnectionLostError";
  }
}

function isKnownCode(code: string): code is AdminErrorCode {
  return code in CODE_MESSAGES;
}

export function codeOf(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("code" in body)) return null;
  return typeof body.code === "string" ? body.code : null;
}

function isFieldProblem(value: unknown): value is FieldProblem {
  return !!value && typeof value === "object" && "field" in value && typeof value.field === "string" && "message" in value && typeof value.message === "string";
}

export function fieldsOf(body: unknown): FieldProblem[] {
  if (!body || typeof body !== "object" || !("fields" in body) || !Array.isArray(body.fields)) return [];
  return body.fields.filter(isFieldProblem);
}

export function messageFor(status: number, code: string | null): string {
  if (code && isKnownCode(code)) return CODE_MESSAGES[code];
  return STATUS_MESSAGES[status] ?? FALLBACK;
}

export function toAdminError(status: number, body: unknown): AdminApiError {
  const code = codeOf(body);
  return new AdminApiError(messageFor(status, code), status, code, fieldsOf(body));
}

export function isStale(error: unknown): boolean {
  return error instanceof AdminApiError && (error.status === 404 || error.status === 409);
}

export function withMessage(status: number, message: string) {
  return (error: unknown): never => {
    if (error instanceof AdminApiError && error.status === status) throw new AdminApiError(message, status, error.code, error.fields);
    throw error;
  };
}

export function errorText(error: unknown): string {
  if (error instanceof AdminApiError || error instanceof ConnectionLostError) return error.message;
  return FALLBACK;
}
