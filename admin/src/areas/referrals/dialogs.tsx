import { useEffect, useState } from "react";
import { AdminApiError, errorText } from "../../api/errors";
import type { Money } from "../../api/types";
import { ReasonDialog } from "../../components/ReasonDialog";
import { formatDate, formatMoney } from "../../format";
import { payableCommissions, referralsApi, totalsByCurrency, type CommissionAction } from "./api";
import { COMMISSION_KIND, customerName, VAT_CONDITIONS } from "./labels";
import { SelectField, TextField } from "./parts";
import type { Attribution, Commission, CustomerMatch, Payout, Reseller } from "./types";
import { UserPicker } from "./UserPicker";

const NAME_MAX = 200;
const TAX_ID_MAX = 20;
const TRANSFER_MAX = 200;

function refuse(message: string): never {
  throw new AdminApiError(message, 400, null);
}

function singleAmount(amounts: readonly Money[]): Money | undefined {
  const totals = totalsByCurrency(amounts);
  return totals.length === 1 ? totals[0] : undefined;
}

function Totals({ amounts }: { amounts: readonly Money[] }) {
  const totals = totalsByCurrency(amounts);
  if (totals.length < 2) return null;
  return (
    <ul className="ref-totals-list">
      {totals.map((total) => (
        <li key={total.currency} className="num">
          {formatMoney(total)} {total.currency}
        </li>
      ))}
    </ul>
  );
}

type Closable = { onClose: () => void };

const PICK_USER = "Buscá y elegí un usuario.";

const EMPTY_RESELLER = {
  displayName: "",
  legalName: "",
  taxId: "",
  vatCondition: "",
  payoutMethod: "",
  payoutReference: "",
};

type ResellerDraft = typeof EMPTY_RESELLER;

type ResellerProblems = Partial<Record<keyof ResellerDraft | "user", string>>;

function resellerProblems(user: CustomerMatch | null, draft: ResellerDraft): ResellerProblems {
  const problems: ResellerProblems = {};
  if (!user) problems.user = PICK_USER;
  if (!draft.displayName.trim()) problems.displayName = "Poné cómo lo va a ver el equipo.";
  if (!draft.legalName.trim()) problems.legalName = "Poné la razón social o el nombre fiscal.";
  if (!draft.taxId.trim()) problems.taxId = "Poné el CUIT.";
  if (!draft.vatCondition) problems.vatCondition = "Elegí la condición frente al IVA.";
  return problems;
}

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function CreateResellerDialog({ onClose, onCreated }: Closable & { onCreated: (reseller: Reseller) => void }) {
  const [user, setUser] = useState<CustomerMatch | null>(null);
  const [draft, setDraft] = useState<ResellerDraft>(EMPTY_RESELLER);
  const [tried, setTried] = useState(false);
  const problems = tried ? resellerProblems(user, draft) : {};
  const set = (key: keyof ResellerDraft) => (value: string) => setDraft((current) => ({ ...current, [key]: value }));

  function pick(customer: CustomerMatch) {
    setUser(customer);
    setDraft((current) => ({
      ...current,
      displayName: current.displayName || (customer.name ?? ""),
      legalName: current.legalName || (customerName(customer) ?? ""),
    }));
  }

  async function confirm(reason: string) {
    setTried(true);
    if (!user || Object.keys(resellerProblems(user, draft)).length > 0) refuse("Revisá los datos marcados.");
    const reseller = await referralsApi.createReseller(
      {
        userId: user.id,
        displayName: draft.displayName.trim(),
        legalName: draft.legalName.trim(),
        taxId: draft.taxId.trim(),
        vatCondition: draft.vatCondition,
        payoutMethod: optional(draft.payoutMethod),
        payoutReference: optional(draft.payoutReference),
      },
      reason,
    );
    onCreated(reseller);
  }

  return (
    <ReasonDialog open title="Nuevo revendedor" confirmLabel="Crear revendedor" onConfirm={confirm} onClose={onClose}>
      <p>El usuario pasa a ser revendedor con la tasa y los ciclos que fija BoxLead. Después le creás un código.</p>
      <div className="ref-form">
        <UserPicker selected={user} onSelect={pick} error={problems.user} />
        <TextField label="Nombre visible" value={draft.displayName} onChange={set("displayName")} error={problems.displayName} maxLength={NAME_MAX} />
        <TextField label="Razón social" value={draft.legalName} onChange={set("legalName")} error={problems.legalName} maxLength={NAME_MAX} />
        <TextField label="CUIT" value={draft.taxId} onChange={set("taxId")} error={problems.taxId} maxLength={TAX_ID_MAX} />
        <SelectField
          label="Condición frente al IVA"
          value={draft.vatCondition}
          options={VAT_CONDITIONS}
          placeholder="Elegí una"
          onChange={set("vatCondition")}
          error={problems.vatCondition}
        />
        <TextField label="Medio de cobro" value={draft.payoutMethod} onChange={set("payoutMethod")} optional maxLength={NAME_MAX} help="Por ejemplo transferencia bancaria." />
        <TextField label="Dato de cobro" value={draft.payoutReference} onChange={set("payoutReference")} optional maxLength={NAME_MAX} help="CBU, CVU o alias." />
      </div>
    </ReasonDialog>
  );
}

type AttributionDialogProps = Closable & {
  resellers: readonly Reseller[];
  fixedUser?: { userId: string; email: string; resellerId: string };
  fixedReseller?: Reseller;
  onDone: (attribution: Attribution) => void;
};

export function AttributionDialog({ resellers, fixedUser, fixedReseller, onClose, onDone }: AttributionDialogProps) {
  const [picked, setPicked] = useState<CustomerMatch | null>(null);
  const [resellerId, setResellerId] = useState(fixedReseller?.id ?? "");
  const [tried, setTried] = useState(false);
  const userId = fixedUser?.userId ?? picked?.id ?? "";
  const email = fixedUser?.email ?? picked?.email;
  const userProblem = tried && !userId ? PICK_USER : null;
  const resellerProblem = tried && !resellerId ? "Elegí a qué revendedor queda atribuido." : null;
  const options = resellers
    .filter((reseller) => reseller.id !== fixedUser?.resellerId)
    .map((reseller) => ({ value: reseller.id, label: reseller.displayName }));
  const target = resellers.find((reseller) => reseller.id === resellerId) ?? fixedReseller;

  async function confirm(reason: string) {
    setTried(true);
    if (!userId || !resellerId) refuse("Revisá los datos marcados.");
    onDone(await referralsApi.correctAttribution(userId, resellerId, reason));
  }

  return (
    <ReasonDialog open title="Corregir atribución" confirmLabel="Corregir atribución" onConfirm={confirm} onClose={onClose}>
      <p>
        {email ? `${email} pasa a estar atribuido` : "El cliente que elijas pasa a estar atribuido"}
        {target ? ` a ${target.displayName}` : " al revendedor que elijas"}. Las comisiones que ya existen no cambian y los ciclos siguen contando por cliente.
      </p>
      <div className="ref-form">
        {fixedUser ? null : <UserPicker selected={picked} onSelect={setPicked} error={userProblem} />}
        {fixedReseller ? null : (
          <SelectField label="Revendedor" value={resellerId} options={options} placeholder="Elegí uno" onChange={setResellerId} error={resellerProblem} />
        )}
      </div>
    </ReasonDialog>
  );
}

const ACTION_COPY: Record<CommissionAction, { title: string; confirm: string; text: string; danger: boolean }> = {
  hold: {
    title: "Retener comisión",
    confirm: "Retener",
    text: "La comisión queda retenida y no entra en ninguna liquidación hasta que la liberes.",
    danger: false,
  },
  release: {
    title: "Liberar comisión",
    confirm: "Liberar",
    text: "La comisión vuelve a quedar devengada y se puede aprobar cuando llegue su fecha de liberación.",
    danger: false,
  },
  reverse: {
    title: "Revertir comisión",
    confirm: "Revertir",
    text: "Se agrega una reversa por lo que quede de esta comisión. Si ya se pagó, se descuenta de la próxima liquidación. No se puede deshacer.",
    danger: true,
  },
};

type CommissionDialogProps = Closable & {
  commission: Commission;
  action: CommissionAction;
  resellerName: string;
  onDone: () => void;
};

export function CommissionDialog({ commission, action, resellerName, onClose, onDone }: CommissionDialogProps) {
  const copy = ACTION_COPY[action];

  async function confirm(reason: string) {
    await referralsApi.changeCommission(action, commission.id, reason);
    onDone();
  }

  return (
    <ReasonDialog
      open
      title={copy.title}
      confirmLabel={copy.confirm}
      tone={copy.danger ? "danger" : "primary"}
      amount={commission.amount}
      onConfirm={confirm}
      onClose={onClose}
    >
      <p>{copy.text}</p>
      <p className="ref-muted">
        {COMMISSION_KIND[commission.kind]} del ciclo {commission.cycleNumber} de {resellerName}, creada el {formatDate(commission.createdAt)}.
        {action === "reverse" ? " El monto es el de la comisión, la reversa toma solo lo que quede." : ""}
      </p>
    </ReasonDialog>
  );
}

export function ApproveDialog({ commissions, onClose, onDone }: Closable & { commissions: readonly Commission[]; onDone: () => void }) {
  const amounts = commissions.map((commission) => commission.amount);

  async function confirm(reason: string) {
    await referralsApi.approve(
      commissions.map((commission) => commission.id),
      reason,
    );
    onDone();
  }

  return (
    <ReasonDialog
      open
      title="Aprobar comisiones"
      confirmLabel={commissions.length === 1 ? "Aprobar comisión" : `Aprobar ${commissions.length} comisiones`}
      amount={singleAmount(amounts)}
      onConfirm={confirm}
      onClose={onClose}
    >
      <p>
        {commissions.length === 1 ? "La comisión pasa" : `Las ${commissions.length} comisiones pasan`} a aprobadas y entran en la próxima liquidación
        del revendedor. Se aprueban todas o ninguna.
      </p>
      <Totals amounts={amounts} />
    </ReasonDialog>
  );
}

type Preview = { status: "idle" } | { status: "loading" } | { status: "ready"; commissions: Commission[] } | { status: "error"; message: string };

function todayInBuenosAires(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

type CreatePayoutDialogProps = Closable & {
  resellers: readonly Reseller[];
  fixedReseller?: Reseller;
  onCreated: (payout: Payout) => void;
};

export function CreatePayoutDialog({ resellers, fixedReseller, onClose, onCreated }: CreatePayoutDialogProps) {
  const [resellerId, setResellerId] = useState(fixedReseller?.id ?? "");
  const [periodEnd, setPeriodEnd] = useState(todayInBuenosAires);
  const [preview, setPreview] = useState<Preview>({ status: "idle" });
  const [tried, setTried] = useState(false);
  const ready = Boolean(resellerId && periodEnd);
  const [previewKey, setPreviewKey] = useState("");
  const key = ready ? `${resellerId}|${periodEnd}` : "";
  if (key !== previewKey) {
    setPreviewKey(key);
    setPreview(key ? { status: "loading" } : { status: "idle" });
  }

  useEffect(() => {
    if (!resellerId || !periodEnd) return;
    let cancelled = false;
    payableCommissions(resellerId, periodEnd).then(
      (commissions) => {
        if (!cancelled) setPreview({ status: "ready", commissions });
      },
      (error: unknown) => {
        if (!cancelled) setPreview({ status: "error", message: errorText(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [resellerId, periodEnd]);

  const amounts = preview.status === "ready" ? preview.commissions.map((commission) => commission.amount) : [];
  const total = singleAmount(amounts);
  const name = (resellers.find((reseller) => reseller.id === resellerId) ?? fixedReseller)?.displayName;

  async function confirm(reason: string) {
    setTried(true);
    if (!resellerId || !periodEnd) refuse("Elegí el revendedor y el cierre del período.");
    if (preview.status === "ready" && preview.commissions.length === 0) refuse("No hay comisiones aprobadas para liquidar hasta esa fecha.");
    if (preview.status === "ready" && totalsByCurrency(amounts).length > 1) refuse("Las comisiones aprobadas mezclan monedas y no entran en una sola liquidación.");
    if (preview.status === "ready" && total && total.amountMinor <= 0) refuse("El saldo aprobado no es positivo. Queda para la próxima liquidación.");
    onCreated(await referralsApi.createPayout(resellerId, periodEnd, reason));
  }

  return (
    <ReasonDialog open title="Armar liquidación" confirmLabel="Armar liquidación" amount={total} onConfirm={confirm} onClose={onClose}>
      <p>
        Toma las comisiones aprobadas {name ? `de ${name} ` : ""}liberadas hasta el cierre del período y las junta en una liquidación para exportar y pagar.
      </p>
      <div className="ref-form">
        {fixedReseller ? null : (
          <SelectField
            label="Revendedor"
            value={resellerId}
            options={resellers.map((reseller) => ({ value: reseller.id, label: reseller.displayName }))}
            placeholder="Elegí uno"
            onChange={setResellerId}
            error={tried && !resellerId ? "Elegí un revendedor." : null}
          />
        )}
        <TextField label="Cierre del período" type="date" value={periodEnd} onChange={setPeriodEnd} error={tried && !periodEnd ? "Elegí una fecha." : null} />
      </div>
      {preview.status === "loading" ? (
        <p className="ref-muted" role="status">
          Calculando el monto…
        </p>
      ) : preview.status === "error" ? (
        <p className="field-error">No pudimos calcular el monto. {preview.message}</p>
      ) : preview.status === "ready" ? (
        <p className="ref-muted">
          {preview.commissions.length === 0
            ? "No hay comisiones aprobadas para liquidar hasta esa fecha."
            : `${preview.commissions.length} ${preview.commissions.length === 1 ? "movimiento" : "movimientos"}. El monto final lo calcula BoxLead al armarla.`}
        </p>
      ) : null}
      <Totals amounts={amounts} />
    </ReasonDialog>
  );
}

export function ExportPayoutDialog({ payout, onClose, onExport }: Closable & { payout: Payout; onExport: (reason: string) => Promise<void> }) {
  return (
    <ReasonDialog open title="Exportar CSV" confirmLabel="Exportar CSV" amount={payout.total} onConfirm={onExport} onClose={onClose}>
      <p>
        Se baja el CSV con los datos fiscales y de cobro del revendedor y una fila por movimiento.
        {payout.status === "DRAFT" ? " La liquidación pasa a exportada." : ""}
      </p>
      <p className="ref-muted">No lo guardes en lugares compartidos, tiene el CUIT y el dato de cobro.</p>
    </ReasonDialog>
  );
}

export function MarkPaidDialog({ payout, onClose, onPaid }: Closable & { payout: Payout; onPaid: (payout: Payout) => void }) {
  const [reference, setReference] = useState("");

  async function confirm(reason: string) {
    onPaid(await referralsApi.markPaid(payout.id, optional(reference), reason));
  }

  return (
    <ReasonDialog open title="Marcar pagada" confirmLabel="Marcar pagada" amount={payout.total} onConfirm={confirm} onClose={onClose}>
      <p>Confirmá que ya transferiste el total. La liquidación y sus movimientos pasan a pagados y no se puede deshacer.</p>
      <div className="ref-form">
        <TextField
          label="Referencia de la transferencia"
          value={reference}
          onChange={setReference}
          optional
          maxLength={TRANSFER_MAX}
          help="El número de operación del banco, si lo tenés."
        />
      </div>
    </ReasonDialog>
  );
}
