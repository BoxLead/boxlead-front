import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../../../src/components/EmptyState/EmptyState";
import { Banner } from "../../../../src/components/ui/Banner";
import { messageFor } from "../../api/errors";
import { useAdminQuery } from "../../components/list/useAdminQuery";
import { Screen } from "../../components/Screen";
import { formatDate, formatDateTime } from "../../format";
import { canAccess } from "../../session/roles";
import { useAdmin } from "../../session/session";
import { AttributionPanel } from "./AttributionPanel";
import { DemoPanel } from "./DemoPanel";
import { ACCESS_LABELS, planLabel, PLAN_SOURCE_LABELS } from "./labels";
import { LimitsPanel } from "./LimitsPanel";
import { ErrorBlock, Facts, LoadingBlock, Muted, Section } from "./parts";
import { PaymentsPanel } from "./PaymentsPanel";
import { SubscriptionPanel } from "./SubscriptionPanel";
import type { CustomerFile } from "./types";
import { UsagePanel } from "./UsagePanel";

const TITLE = "Detalle de usuario";
const BACK = { to: "/usuarios", label: "Usuarios" };
const NOT_FOUND = messageFor(404, null);

function ProfilePanel({ file }: { file: CustomerFile }) {
  const profile = file.billingProfile;
  const taxId = profile?.taxId ? [profile.taxIdType, profile.taxId].filter(Boolean).join(" ") : null;
  return (
    <Section title="Perfil">
      <Facts
        items={[
          { label: "Email", value: file.email },
          { label: "Nombre", value: file.name ?? "—" },
          { label: "Alta", value: formatDateTime(file.createdAt) },
          { label: "Id", value: <code className="customer-code">{file.id}</code> },
        ]}
      />
      {profile ? (
        <Facts
          items={[
            { label: "Razón social", value: profile.legalName ?? "—" },
            taxId ? { label: "Identificación fiscal", value: taxId } : null,
            profile.vatCondition ? { label: "Condición de IVA", value: profile.vatCondition } : null,
            profile.country ? { label: "País", value: profile.country } : null,
          ]}
        />
      ) : (
        <Muted>Todavía no cargó sus datos de facturación.</Muted>
      )}
    </Section>
  );
}

function PlanPanel({ file }: { file: CustomerFile }) {
  const { plan, access, period, enforced } = file.entitlements;
  return (
    <Section title="Plan" hint="Lo que rige hoy según su suscripción, su Demo y sus ajustes.">
      <Facts
        items={[
          { label: "Plan", value: planLabel(plan.code) },
          { label: "Viene de", value: PLAN_SOURCE_LABELS[plan.source] },
          { label: "Acceso", value: enforced ? ACCESS_LABELS[access] : `${ACCESS_LABELS[access]}, todavía sin aplicar` },
          { label: "Período", value: `${formatDate(period.start)} al ${formatDate(period.end)}` },
        ]}
      />
    </Section>
  );
}

function CustomerBody({ file, reload }: { file: CustomerFile; reload: () => void }) {
  const me = useAdmin();
  const owner = canAccess(me.roles, ["OWNER"]);
  const support = canAccess(me.roles, ["SUPPORT"]);
  return (
    <div className="customer-grid">
      <ProfilePanel file={file} />
      <PlanPanel file={file} />
      <SubscriptionPanel userId={file.id} subscription={file.subscription} canOperate={owner} onChanged={reload} />
      <DemoPanel userId={file.id} demo={file.demo} canOperate={support} onChanged={reload} />
      <div className="customer-wide">
        <PaymentsPanel payments={file.payments} />
      </div>
      <div className="customer-wide">
        <LimitsPanel userId={file.id} entitlements={file.entitlements} overrides={file.overrides} canOperate={owner} onChanged={reload} />
      </div>
      <div className="customer-wide">
        <UsagePanel userId={file.id} entitlements={file.entitlements} />
      </div>
      <div className="customer-wide">
        <AttributionPanel
          userId={file.id}
          attribution={file.attribution}
          resellerId={file.resellerId}
          canOperate={owner}
          onChanged={reload}
        />
      </div>
    </div>
  );
}

function CustomerDetail({ userId }: { userId: string }) {
  const query = useAdminQuery<CustomerFile>(`/admin/customers/${encodeURIComponent(userId)}`);
  const [file, setFile] = useState<CustomerFile | null>(null);
  if (query.status === "ready" && query.data !== file) setFile(query.data);

  let body;
  if (file) {
    body = (
      <>
        {query.status === "error" ? (
          <Banner tone="danger" title="No pudimos actualizar el usuario" className="customer-stale">
            {query.message}
          </Banner>
        ) : null}
        <CustomerBody file={file} reload={query.reload} />
      </>
    );
  } else if (query.status === "error" && query.message === NOT_FOUND) {
    body = (
      <div className="panel">
        <EmptyState
          illustration="missing"
          title="No encontramos este usuario"
          hint="Puede que el link esté mal o que la cuenta ya no exista."
          action={
            <Link className="btn btn-secondary" to="/usuarios">
              Volver a Usuarios
            </Link>
          }
        />
      </div>
    );
  } else if (query.status === "error") {
    body = <ErrorBlock title="No pudimos cargar el usuario" message={query.message} onRetry={query.reload} />;
  } else {
    body = (
      <div className="panel">
        <LoadingBlock rows={6} />
      </div>
    );
  }

  return (
    <Screen title={TITLE} description={file?.email} back={BACK}>
      {body}
    </Screen>
  );
}

export function CustomerDetailScreen() {
  const { userId = "" } = useParams();
  return <CustomerDetail key={userId} userId={userId} />;
}
