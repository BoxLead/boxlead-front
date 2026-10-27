import { useId, useState } from "react";
import { Banner } from "../../../../src/components/ui/Banner";
import { ChoiceGroup } from "../../../../src/components/ui/ChoiceGroup";
import { Tag } from "../../../../src/components/ui/Tag";
import { useToast } from "../../../../src/components/ui/toast";
import { adminApi } from "../../api/client";
import { AdminApiError } from "../../api/errors";
import type { AdminPage, AdminRole } from "../../api/types";
import { ReasonDialog } from "../../components/ReasonDialog";
import { Screen } from "../../components/Screen";
import type { Column } from "../../components/list/DataTable";
import { SearchFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import { useAdminQuery } from "../../components/list/useAdminQuery";
import { useListQuery } from "../../components/list/useListQuery";
import { formatDateTime } from "../../format";
import { navItem } from "../../nav";
import { ROLE_LABELS } from "../../session/roles";
import { isFuture, useAdmin, useSession } from "../../session/session";
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

function withMessage(status: number, message: string) {
  return (error: unknown) => {
    if (error instanceof AdminApiError && error.status === status) throw new AdminApiError(message, status, error.code);
    throw error;
  };
}

function Factor({ member }: { member: TeamMember }) {
  if (member.factorConfirmed) {
    return (
      <span className="ops-stack">
        <Tag tone="success">Configurado</Tag>
      </span>
    );
  }
  if (isFuture(member.enrollmentOpenUntil)) {
    return (
      <span className="ops-stack">
        <Tag tone="warning">Sin configurar</Tag>
        <span className="ops-muted">Puede hasta el {formatDateTime(member.enrollmentOpenUntil)}</span>
      </span>
    );
  }
  return (
    <span className="ops-stack">
      <Tag tone="danger">Ventana vencida</Tag>
      <span className="ops-muted">Quitale el rol y dáselo de nuevo</span>
    </span>
  );
}

function GrantPanel({ members, onClose, onGranted }: { members: readonly TeamMember[]; onClose: () => void; onGranted: () => void }) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<CustomerMatch | null>(null);
  const [role, setRole] = useState<AdminRole>("SUPPORT");
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();
  const results = useAdminQuery<AdminPage<CustomerMatch>>(search ? "/admin/customers" : null, new URLSearchParams({ query: search }).toString());
  const current = picked ? (members.find((member) => member.userId === picked.id)?.roles.map((grant) => grant.role) ?? []) : [];

  function pick(customer: CustomerMatch) {
    setPicked(customer);
    const held = members.find((member) => member.userId === customer.id)?.roles.map((grant) => grant.role) ?? [];
    setRole(ROLES.find((candidate) => !held.includes(candidate)) ?? "SUPPORT");
  }

  async function grant(reason: string) {
    if (!picked) return;
    await adminApi
      .post<AdminGrant>("/admin/grants", { userId: picked.id, role, reason })
      .catch(withMessage(409, "Esa persona ya tiene ese rol."));
    toast({ tone: "success", message: `${picked.email} ya tiene el rol ${ROLE_LABELS[role]}.` });
    setConfirming(false);
    onGranted();
  }

  return (
    <section className="panel ops-panel-pad ops-grant" aria-labelledby={titleId}>
      <div className="ops-grant-head">
        <h2 id={titleId} className="ops-section-title">
          Otorgar un rol
        </h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <p className="ops-muted">
        La persona necesita una cuenta de BoxLead con contraseña. Buscala por email, nombre o id.
      </p>
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
          <div className="list-loading" role="status">
            <span className="skeleton list-skeleton-row" />
            <span className="visually-hidden">Buscando…</span>
          </div>
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
          <p className="ops-muted">No encontramos a nadie con eso. Probá con el email completo.</p>
        ) : (
          <ul className="ops-matches" aria-label="Resultados">
            {results.data.items.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  className="ops-match"
                  aria-pressed={picked?.id === customer.id}
                  onClick={() => pick(customer)}
                >
                  <span className="ops-match-email">{customer.email}</span>
                  <span className="ops-muted">{customer.name ?? customer.legalName ?? "Sin nombre"}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
      {picked ? (
        <div className="ops-grant-role">
          <div className="ops-choice">
            <ChoiceGroup<AdminRole>
              label="Rol"
              variant="segmented"
              value={role}
              onChange={setRole}
              choices={ROLES.map((value) => ({ value, label: ROLE_LABELS[value], disabled: current.includes(value) }))}
            />
          </div>
          <p className="ops-muted">{ROLE_SCOPE[role]}</p>
          <div>
            <button type="button" className="btn btn-primary" disabled={current.includes(role)} onClick={() => setConfirming(true)}>
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
        >
          <p>
            <strong>{picked.email}</strong> va a tener el rol {ROLE_LABELS[role]}. {ROLE_SCOPE[role]}
          </p>
          <p>
            Si todavía no configuró su factor, tiene 24 horas para hacerlo al entrar al backoffice. Para entrar también tiene que estar
            en la lista de Cloudflare Access, que se carga aparte.
          </p>
        </ReasonDialog>
      ) : null}
    </section>
  );
}

function RevokeSummary({ revoking, lastRole, self }: { revoking: Revoking; lastRole: boolean; self: boolean }) {
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
      {self ? <p>Es tu propia cuenta. Lo que quites deja de valer para vos apenas confirmes.</p> : null}
    </>
  );
}

export function TeamScreen() {
  const item = navItem("team");
  const me = useAdmin();
  const { retry } = useSession();
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

  async function revoke(reason: string) {
    if (!revoking) return;
    await adminApi
      .delete<void>(`/admin/grants/${revoking.role.grantId}`, { reason })
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
      cell: (row) => (
        <span className="ops-stack">
          <span>{row.name ?? "Sin nombre"}</span>
          <span className="ops-muted">{row.email}</span>
          {row.userId === me.userId ? <Tag tone="accent">Vos</Tag> : null}
        </span>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      cell: (row) => (
        <ul className="ops-roles">
          {row.roles.map((grant) => (
            <li key={grant.grantId} className="ops-role">
              <Tag tone="accent">{ROLE_LABELS[grant.role]}</Tag>
              {soleOwner(grant) ? (
                <span className="ops-muted">Único Dueño</span>
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
    { key: "factor", header: "Factor", cell: (row) => <Factor member={row} /> },
    {
      key: "session",
      header: "Última sesión",
      cell: (row) => (row.lastAdminSessionAt ? formatDateTime(row.lastAdminSessionAt) : <span className="ops-muted">Nunca</span>),
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
      >
        {revoking ? (
          <RevokeSummary
            revoking={revoking}
            lastRole={revoking.member.roles.length <= 1}
            self={revoking.member.userId === me.userId}
          />
        ) : null}
      </ReasonDialog>
    </Screen>
  );
}
