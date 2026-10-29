import { useState } from "react";
import { Link } from "react-router-dom";
import { Banner } from "../../../../src/components/ui/Banner";
import { ChoiceGroup } from "../../../../src/components/ui/ChoiceGroup";
import { Tag } from "../../../../src/components/ui/Tag";
import { useToast } from "../../../../src/components/ui/toast";
import { adminApi } from "../../api/client";
import { AdminApiError, isStale, withMessage } from "../../api/errors";
import type { AdminPage, AdminRole } from "../../api/types";
import { DateText } from "../../components/DateText";
import { ReasonDialog } from "../../components/ReasonDialog";
import { Screen } from "../../components/Screen";
import { Muted, Section } from "../../components/Section";
import { TableSkeleton } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";
import type { Column } from "../../components/list/DataTable";
import { SearchFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { useAdminQuery } from "../../components/list/useAdminQuery";
import { useListQuery } from "../../components/list/useListQuery";
import { formatDateTime } from "../../format";
import { navItem } from "../../nav";
import { ROLE_LABELS } from "../../session/roles";
import { isFuture, useAdmin, useSession } from "../../session/session";
import { FACTOR_STATUS, PLAN_SOURCE_LABELS, SUBSCRIPTION_STATUS, TEAM_LABEL } from "../../status";
import type { CustomerFile, SubscriptionStatus } from "../customers/types";
import type { AdminGrant, CustomerMatch, MemberRole, TeamMember } from "./types";
import "./Operations.css";

const KEYS: readonly string[] = [];
const ROLES: readonly AdminRole[] = ["SUPPORT", "FINANCE", "OWNER"];

const ROLE_SCOPE: Record<AdminRole, string> = {
  OWNER: "Puede hacer todo, incluso dar y quitar roles y leer la auditoría.",
  FINANCE: "Ve ingresos y opera reembolsos, facturas, comisiones, liquidaciones y arrepentimientos.",
  SUPPORT: "Opera invitaciones, Demo y pedidos de baja.",
};

type Revoking = { member: TeamMember; role: MemberRole };

function chargeNotice(status: SubscriptionStatus): string {
  if (status === "PAUSED") return "Mientras esté pausada Mercado Pago no le cobra, pero si se reanuda le vuelve a cobrar hasta que se dé de baja.";
  if (status === "INCOMPLETE") {
    return "Todavía no pagó la primera cuota. Si completa el pago en Mercado Pago, empieza a cobrarle todos los meses hasta que se dé de baja.";
  }
  return "Mercado Pago le sigue cobrando hasta que se dé de baja.";
}

const NO_PASSWORD = "Esta cuenta no tiene contraseña. Puede entrar si antes abre sesión en boxlead.app con Google.";

function blockedRoles(held: readonly AdminRole[]): AdminRole[] {
  return held.includes("OWNER") ? [...ROLES] : [...held];
}

function useRoleLost() {
  const { retry } = useSession();
  return (error: unknown): never => {
    if (error instanceof AdminApiError && error.code === "ROLE_REQUIRED") void retry();
    throw error;
  };
}

function Factor({ member }: { member: TeamMember }) {
  if (member.factorConfirmed) return <StatusBadge status={FACTOR_STATUS.CONFIRMED} />;
  if (isFuture(member.enrollmentOpenUntil)) {
    return (
      <span className="cell-stack">
        <StatusBadge status={FACTOR_STATUS.PENDING} />
        <span className="sub-text">Puede hasta el {formatDateTime(member.enrollmentOpenUntil)}</span>
      </span>
    );
  }
  return (
    <span className="cell-stack">
      <StatusBadge status={FACTOR_STATUS.EXPIRED} />
      <span className="sub-text">Quitale el rol y dáselo de nuevo</span>
    </span>
  );
}

type AccountCheck = ReturnType<typeof useAdminQuery<CustomerFile>>;

function AccountNotices({ userId, account }: { userId: string; account: AccountCheck }) {
  if (account.status === "loading") return <Muted>Revisando su suscripción y su atribución…</Muted>;
  if (account.status === "error") {
    return (
      <Banner tone="warning" title="No pudimos revisar su cuenta">
        {account.message} Mirá su suscripción y su atribución en{" "}
        <Link className="entity-link" to={`/usuarios/${userId}`}>
          su ficha
        </Link>{" "}
        antes de seguir.
      </Banner>
    );
  }
  const subscription = account.data.subscription;
  const live = subscription && subscription.status !== "CANCELED" ? subscription : null;
  const attribution = account.data.attribution;
  return (
    <>
      {live ? (
        <Banner tone="warning" title="Tiene una suscripción viva">
          Hoy figura como {SUBSCRIPTION_STATUS[live.status].label}. Mientras tenga el rol su acceso viene del equipo, pero la suscripción sigue viva.{" "}
          {chargeNotice(live.status)}
        </Banner>
      ) : null}
      {attribution ? (
        <Banner tone="warning" title="Está atribuida a un revendedor">
          Revisá si la atribución tiene que seguir así.{" "}
          <Link className="entity-link" to={`/revendedores/${attribution.resellerId}`}>
            Ver el revendedor
          </Link>
        </Banner>
      ) : null}
    </>
  );
}

type GrantPanelProps = { members: readonly TeamMember[]; onClose: () => void; onGranted: () => void; onStale: () => void };

function GrantPanel({ members, onClose, onGranted, onStale }: GrantPanelProps) {
  const toast = useToast();
  const roleLost = useRoleLost();
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<CustomerMatch | null>(null);
  const [role, setRole] = useState<AdminRole>("SUPPORT");
  const [confirming, setConfirming] = useState(false);
  const results = useAdminQuery<AdminPage<CustomerMatch>>(search ? "/admin/customers" : null, new URLSearchParams({ query: search }).toString());
  const held = picked ? (members.find((member) => member.userId === picked.id)?.roles.map((grant) => grant.role) ?? []) : [];
  const account = useAdminQuery<CustomerFile>(picked && confirming && held.length === 0 ? `/admin/customers/${picked.id}` : null);
  const blocked = blockedRoles(held);

  function pick(customer: CustomerMatch) {
    setPicked(customer);
    const roles = blockedRoles(members.find((member) => member.userId === customer.id)?.roles.map((grant) => grant.role) ?? []);
    setRole(ROLES.find((candidate) => !roles.includes(candidate)) ?? "SUPPORT");
  }

  async function grant(reason: string) {
    if (!picked) return;
    await adminApi
      .post<AdminGrant>("/admin/grants", { userId: picked.id, role, reason })
      .catch(roleLost)
      .catch(withMessage(409, "Esa persona ya tiene ese rol."));
    toast({ tone: "success", message: `${picked.email} ya tiene el rol ${ROLE_LABELS[role]}.` });
    setConfirming(false);
    onGranted();
  }

  return (
    <Section
      title="Otorgar un rol"
      hint="La persona necesita una cuenta de BoxLead. Buscala por email, nombre o id."
      actions={
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <SearchFilter
        label="Buscar usuario"
        value={search}
        placeholder="Email, nombre o id"
        onSubmit={(value) => {
          setSearch(value);
          setPicked(null);
        }}
      />
      {search ? (
        results.status === "loading" ? (
          <TableSkeleton columns={1} rows={2} />
        ) : results.status === "error" ? (
          <Banner
            tone="danger"
            title="No pudimos buscar"
            action={
              <button type="button" className="btn btn-secondary btn-sm" onClick={results.reload}>
                Reintentar
              </button>
            }
          >
            {results.message}
          </Banner>
        ) : results.data.items.length === 0 ? (
          <Muted>No encontramos a nadie con eso. Probá con el email completo.</Muted>
        ) : (
          <ul className="team-matches" aria-label="Resultados">
            {results.data.items.map((customer) => (
              <li key={customer.id}>
                <button type="button" className="team-match" aria-pressed={picked?.id === customer.id} onClick={() => pick(customer)}>
                  <span className="team-match-email">{customer.email}</span>
                  <span className="sub-text">{customer.name ?? customer.legalName ?? "Sin nombre"}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
      {picked ? (
        <div className="team-grant-role">
          <div className="ops-choice">
            <ChoiceGroup<AdminRole>
              label="Rol"
              variant="segmented"
              value={role}
              onChange={setRole}
              choices={ROLES.map((value) => ({ value, label: ROLE_LABELS[value], disabled: blocked.includes(value) }))}
            />
          </div>
          <Muted>{held.includes("OWNER") ? "Ya es Dueño, que incluye todos los permisos." : ROLE_SCOPE[role]}</Muted>
          {picked.hasPassword ? null : <Banner tone="warning">{NO_PASSWORD}</Banner>}
          <div>
            <button type="button" className="btn btn-primary" disabled={blocked.includes(role)} onClick={() => setConfirming(true)}>
              Otorgar {ROLE_LABELS[role]}
            </button>
          </div>
        </div>
      ) : null}
      {picked ? (
        <ReasonDialog
          open={confirming}
          title="Otorgar rol"
          confirmLabel={`Otorgar ${ROLE_LABELS[role]}`}
          onConfirm={grant}
          onClose={() => setConfirming(false)}
          onSettled={(failure) => {
            if (isStale(failure)) onStale();
          }}
        >
          <p>
            <strong>{picked.email}</strong> va a tener el rol {ROLE_LABELS[role]}. {ROLE_SCOPE[role]}
          </p>
          {picked.hasPassword ? null : <p>{NO_PASSWORD}</p>}
          {held.length === 0 ? (
            <>
              <p>
                Cuando configure su factor, esta cuenta pasa a usar BoxLead sin pagar con los límites de Business, tenga o no un plan.
              </p>
              <AccountNotices userId={picked.id} account={account} />
            </>
          ) : null}
          <p>
            Si todavía no configuró su factor, tiene 24 horas para hacerlo al entrar al backoffice. Para entrar también tiene que estar
            en la lista de Cloudflare Access, que se carga aparte.
          </p>
        </ReasonDialog>
      ) : null}
    </Section>
  );
}

type RevokeSummaryProps = { revoking: Revoking; lastRole: boolean; self: boolean; noEnrolledOwner: boolean };

function RevokeSummary({ revoking, lastRole, self, noEnrolledOwner }: RevokeSummaryProps) {
  return (
    <>
      <p>
        Le quitás el rol {ROLE_LABELS[revoking.role.role]} a <strong>{revoking.member.email}</strong>.
      </p>
      {lastRole ? (
        <p>
          Es su último rol. Se borra su factor TOTP y se cierran sus sesiones de administración. Si vuelve, necesita un rol nuevo y
          configurar el factor de cero. Sacalo también de la lista de Cloudflare Access.
        </p>
      ) : (
        <p>Sigue con sus otros roles y con su factor.</p>
      )}
      {noEnrolledOwner ? (
        <p>
          <strong>Ningún otro Dueño configuró su factor.</strong> Si lo quitás, nadie va a poder dar ni quitar roles hasta que otro
          Dueño lo configure.
        </p>
      ) : null}
      {self ? <p>Es tu propia cuenta. Lo que quites deja de valer para vos apenas confirmes.</p> : null}
    </>
  );
}

export function TeamScreen() {
  const item = navItem("team");
  const me = useAdmin();
  const { retry } = useSession();
  const roleLost = useRoleLost();
  const toast = useToast();
  const { params, query } = useListQuery<TeamMember>("/admin/grants", KEYS);
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState<Revoking | null>(null);
  const members = query.status === "ready" ? query.data.items : [];
  const complete = query.status === "ready" && query.data.totalItems <= query.data.items.length;
  const owners = members.filter((member) => member.roles.some((grant) => grant.role === "OWNER")).length;

  function soleOwner(role: MemberRole): boolean {
    return complete && role.role === "OWNER" && owners <= 1;
  }

  function noEnrolledOwner({ member, role }: Revoking): boolean {
    if (!complete || role.role !== "OWNER") return false;
    return !members.some((other) => other.userId !== member.userId && other.factorConfirmed && other.roles.some((grant) => grant.role === "OWNER"));
  }

  async function revoke(reason: string) {
    if (!revoking) return;
    await adminApi
      .delete<void>(`/admin/grants/${revoking.role.grantId}`, { reason })
      .catch(roleLost)
      .catch(withMessage(404, "Ese rol ya fue quitado."))
      .catch(withMessage(409, "Es el último Dueño y no se puede quitar. Otorgá Dueño a otra persona primero."));
    toast({ tone: "success", message: `Le quitaste ${ROLE_LABELS[revoking.role.role]} a ${revoking.member.email}.` });
    const self = revoking.member.userId === me.userId;
    setRevoking(null);
    if (self) await retry();
    else query.reload();
  }

  const columns: Column<TeamMember>[] = [
    {
      key: "person",
      header: "Persona",
      width: "md",
      cell: (row) => (
        <span className="cell-stack">
          <span className="team-person">
            {row.name ?? "Sin nombre"}
            {row.userId === me.userId ? <Tag>Vos</Tag> : null}
          </span>
          <span className="sub-text">{row.email}</span>
          <Link className="entity-link sub-text" to={`/auditoria?${new URLSearchParams({ actorUserId: row.userId }).toString()}`} aria-label={`Ver auditoría de ${row.email}`}>
            Ver auditoría
          </Link>
        </span>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      width: "md",
      cell: (row) => (
        <ul className="team-roles">
          {row.roles.map((grant) => (
            <li key={grant.grantId} className="team-role">
              <Tag tone="accent">{ROLE_LABELS[grant.role]}</Tag>
              {soleOwner(grant) ? (
                <span className="sub-text">Único Dueño</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-label={`Quitar ${ROLE_LABELS[grant.role]} a ${row.email}`}
                  onClick={() => setRevoking({ member: row, role: grant })}
                >
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      ),
    },
    { key: "factor", header: "Factor", type: "status", cell: (row) => <Factor member={row} /> },
    {
      key: "plan",
      header: "Plan",
      width: "sm",
      cell: (row) =>
        row.planSource === "TEAM" ? (
          <span className="cell-stack">
            <span>{TEAM_LABEL}</span>
            <span className="sub-text">Límites de Business sin pagar</span>
          </span>
        ) : (
          <span className="cell-stack">
            <span>{PLAN_SOURCE_LABELS[row.planSource]}</span>
            <span className="sub-text">Pasa a {TEAM_LABEL} cuando configure su factor</span>
          </span>
        ),
    },
    {
      key: "session",
      header: "Última sesión",
      type: "date",
      cell: (row) => (row.lastAdminSessionAt ? <DateText value={row.lastAdminSessionAt} time /> : <span className="sub-text">Nunca</span>),
    },
  ];

  return (
    <Screen
      title={item.label}
      description="Personas con rol en el backoffice. Conviene tener siempre dos Dueños."
      actions={
        granting ? null : (
          <button type="button" className="btn btn-primary" onClick={() => setGranting(true)}>
            Otorgar rol
          </button>
        )
      }
    >
      <div className="ops-sections">
        {granting ? (
          <GrantPanel
            members={members}
            onClose={() => setGranting(false)}
            onGranted={() => {
              setGranting(false);
              query.reload();
            }}
            onStale={query.reload}
          />
        ) : null}
        <ListView<TeamMember>
          caption="Equipo"
          query={query}
          columns={columns}
          rowKey={(row) => row.userId}
          emptyTitle="Nadie tiene rol todavía"
          emptyHint="Otorgá un rol a una cuenta existente para sumarla al equipo."
          onPageChange={params.setPage}
        />
      </div>
      <ReasonDialog
        open={revoking !== null}
        title="Quitar rol"
        confirmLabel="Quitar rol"
        tone="danger"
        onConfirm={revoke}
        onClose={() => setRevoking(null)}
        onSettled={(failure) => {
          if (isStale(failure)) query.reload();
        }}
      >
        {revoking ? (
          <RevokeSummary
            revoking={revoking}
            lastRole={revoking.member.roles.length <= 1}
            self={revoking.member.userId === me.userId}
            noEnrolledOwner={noEnrolledOwner(revoking)}
          />
        ) : null}
      </ReasonDialog>
    </Screen>
  );
}
