import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../../../src/components/EmptyState/EmptyState";
import { Banner } from "../../../../src/components/ui/Banner";
import { messageFor } from "../../api/errors";
import { useAdminQuery } from "../../components/list/useAdminQuery";
import { DateText } from "../../components/DateText";
import { Screen } from "../../components/Screen";
import { StatusBadge } from "../../components/StatusBadge";
import { canAccess } from "../../session/roles";
import { isFuture, useAdmin } from "../../session/session";
import { SUBSCRIPTION_STATUS } from "../../status";
import { AttributionPanel } from "./AttributionPanel";
import { DemoPanel } from "./DemoPanel";
import { ACCESS_LABELS, planLabel, PLAN_SOURCE_LABELS } from "./labels";
import { LimitsPanel } from "./LimitsPanel";
import { ErrorBlock, Facts, LoadingBlock, Muted, Section, SectionGrid } from "./parts";
import { PaymentsPanel } from "./PaymentsPanel";
import { SubscriptionPanel } from "./SubscriptionPanel";
import type { CustomerFile } from "./types";
import { UsagePanel } from "./UsagePanel";
import "./customers.css";

const TITLE = "Detalle de usuario";
const BACK = { to: "/usuarios", label: "Usuarios" };
const NOT_FOUND = messageFor(404, null);

function Summary({ file }: { file: CustomerFile }) {
  const { subscription, entitlements, demo } = file;
  const demoRunning = demo !== null && isFuture(demo.endsAt);
  return (
    <dl className="customer-summary">
      <div>
        <dt>Plan</dt>
        <dd>{planLabel(entitlements.plan.code)}</dd>
      </div>
      <div>
        <dt>Suscripción</dt>
        <dd>{subscription ? <StatusBadge status={SUBSCRIPTION_STATUS[subscription.status]} /> : <span className="muted-text">Sin suscripción</span>}</dd>
      </div>
      <div>
        <dt>Próximo cobro</dt>
        <dd>
          <DateText value={subscription?.providerNextPaymentAt ?? subscription?.currentPeriodEnd} />
        </dd>
      </div>
      <div>
        <dt>Demo</dt>
        <dd>{demoRunning ? <>Hasta el <DateText value={demo.endsAt} /></> : <span className="muted-text">Sin Demo vigente</span>}</dd>
      </div>
      <div>
        <dt>Referido por</dt>
        <dd>
          {file.attribution ? (
            <Link className="customer-link" to={`/revendedores/${file.attribution.resellerId}`}>
              Ver revendedor
            </Link>
          ) : (
            <span className="muted-text">Nadie</span>
          )}
        </dd>
      </div>
    </dl>
  );
}

function ProfilePanel({ file }: { file: CustomerFile }) {
  const profile = file.billingProfile;
  const taxId = profile?.taxId ? [profile.taxIdType, profile.taxId].filter(Boolean).join(" ") : null;
  return (
    <Section title="Perfil">
      <Facts
        columns={2}
        items={[
          { label: "Email", value: file.email },
          { label: "Nombre", value: file.name ?? "—" },
          { label: "Alta", value: <DateText value={file.createdAt} time /> },
          { label: "Id", value: <code className="mono-text">{file.id}</code> },
        ]}
      />
      {profile ? (
        <Facts
          columns={2}
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
        columns={2}
        items={[
          { label: "Plan", value: planLabel(plan.code) },
          { label: "Viene de", value: PLAN_SOURCE_LABELS[plan.source] },
          { label: "Acceso", value: enforced ? ACCESS_LABELS[access] : `${ACCESS_LABELS[access]}, todavía sin aplicar` },
          { label: "Período", value: <><DateText value={period.start} /> al <DateText value={period.end} /></> },
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
    <SectionGrid>
      <ProfilePanel file={file} />
      <PlanPanel file={file} />
      <SubscriptionPanel userId={file.id} subscription={file.subscription} canOperate={owner} onChanged={reload} />
      <DemoPanel userId={file.id} demo={file.demo} canOperate={support} onChanged={reload} />
      <PaymentsPanel payments={file.payments} />
      <LimitsPanel userId={file.id} entitlements={file.entitlements} overrides={file.overrides} canOperate={owner} onChanged={reload} />
      <UsagePanel userId={file.id} entitlements={file.entitlements} />
      <AttributionPanel
        userId={file.id}
        attribution={file.attribution}
        resellerId={file.resellerId}
        canOperate={owner}
        onChanged={reload}
      />
    </SectionGrid>
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
      <div className="panel customer-loading">
        <LoadingBlock rows={6} />
      </div>
    );
  }

  return (
    <Screen
      title={file ? file.email : TITLE}
      description={file ? file.name ?? "Sin nombre cargado" : undefined}
      back={BACK}
      meta={file ? <Summary file={file} /> : undefined}
    >
      {body}
    </Screen>
  );
}

export function CustomerDetailScreen() {
  const { userId = "" } = useParams();
  return <CustomerDetail key={userId} userId={userId} />;
}
