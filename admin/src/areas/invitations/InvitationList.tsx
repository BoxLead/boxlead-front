import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../../../src/components/ui/toast";
import { DateText } from "../../components/DateText";
import { StatusBadge } from "../../components/StatusBadge";
import { FilterBar, SearchFilter, SelectFilter } from "../../components/list/Filters";
import { ListView } from "../../components/list/ListView";
import type { Column } from "../../components/list/DataTable";
import { enumOf, type FilterRules } from "../../components/list/filterRules";
import { useListQuery } from "../../components/list/useListQuery";
import { ReasonDialog } from "../../components/ReasonDialog";
import { ResellerDirectoryNotice } from "../../components/ResellerDirectoryNotice";
import { useResellerDirectory } from "../../session/resellerDirectory";
import { revokeInvitation } from "./api";
import { CreateInvitationFlow } from "./CreateInvitationFlow";
import { daysText } from "./validation";
import { INVITATION_STATUS } from "./labels";
import type { Invitation, InvitationStatus } from "./types";

const FILTERS = ["status", "email"] as const;

const STATUS_OPTIONS = (Object.keys(INVITATION_STATUS) as InvitationStatus[]).map((value) => ({
  value,
  label: INVITATION_STATUS[value].label,
}));
const RULES: FilterRules = { status: enumOf(STATUS_OPTIONS) };

type InvitationListProps = {
  tabs: ReactNode;
  canAct: boolean;
  creating: boolean;
  onCloseCreate: () => void;
};

function closedNote(invitation: Invitation): ReactNode {
  if (invitation.acceptedAt) return <>El <DateText value={invitation.acceptedAt} /></>;
  if (invitation.revokedAt) return <>El <DateText value={invitation.revokedAt} /></>;
  return null;
}

export function InvitationList({ tabs, canAct, creating, onCloseCreate }: InvitationListProps) {
  const toast = useToast();
  const directory = useResellerDirectory();
  const { params, query } = useListQuery<Invitation>("/admin/invitations", FILTERS, RULES);
  const [revoking, setRevoking] = useState<Invitation | null>(null);

  function resellerName(id: string | null): ReactNode {
    if (!id) return "—";
    return directory.find(id)?.displayName ?? <span className="invitations-id">{id.slice(0, 8)}</span>;
  }

  async function revoke(reason: string) {
    if (!revoking) return;
    await revokeInvitation(revoking.id, reason);
    toast({ tone: "success", message: `Revocaste la invitación de ${revoking.email}.` });
    setRevoking(null);
    query.reload();
  }

  const columns: Column<Invitation>[] = [
    { key: "email", header: "Email", width: "lg", cell: (row) => <span className="invitations-email">{row.email}</span> },
    {
      key: "status",
      header: "Estado",
      type: "status",
      cell: (row) => {
        const note = closedNote(row);
        return (
          <span className="invitations-status">
            <StatusBadge status={INVITATION_STATUS[row.status]} />
            {note ? <span className="invitations-note">{note}</span> : null}
            {row.acceptedUserId ? (
              <Link className="invitations-note" to={`/usuarios/${row.acceptedUserId}`}>
                Ver usuario
              </Link>
            ) : null}
          </span>
        );
      },
    },
    { key: "demo", header: "Demo", type: "number", cell: (row) => daysText(row.demoDays) },
    { key: "expires", header: "Vence", type: "date", cell: (row) => <DateText value={row.expiresAt} /> },
    { key: "reseller", header: "Revendedor", cell: (row) => resellerName(row.resellerId) },
    { key: "created", header: "Creada", type: "date", cell: (row) => <DateText value={row.createdAt} /> },
  ];

  if (canAct) {
    columns.push({
      key: "actions",
      header: "Acciones",
      type: "actions",
      cell: (row) =>
        row.status === "OPEN" ? (
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setRevoking(row)}>
            Revocar
          </button>
        ) : (
          <span className="invitations-note">—</span>
        ),
    });
  }

  return (
    <>
      <ListView
        caption="Invitaciones"
        query={query}
        columns={columns}
        rowKey={(row) => row.id}
        filtered={params.active}
        onClearFilters={params.clear}
        onPageChange={params.setPage}
        emptyTitle="Todavía no hay invitaciones"
        emptyHint={canAct ? "Creá la primera con Nueva invitación." : undefined}
        filters={
          <>
            <FilterBar active={params.active} onClear={params.clear} lead={tabs}>
              <SelectFilter
                label="Estado"
                value={params.value("status")}
                options={STATUS_OPTIONS}
                allLabel="Todas"
                onChange={(value) => params.setFilter("status", value)}
              />
              <SearchFilter
                label="Email"
                value={params.value("email")}
                placeholder="Empieza con…"
                onSubmit={(value) => params.setFilter("email", value)}
              />
            </FilterBar>
            <ResellerDirectoryNotice directory={directory} />
          </>
        }
      />
      {canAct ? (
        <>
          <CreateInvitationFlow open={creating} onClose={onCloseCreate} onCreated={query.reload} />
          <ReasonDialog
            open={revoking !== null}
            title="Revocar invitación"
            confirmLabel="Revocar"
            tone="danger"
            onConfirm={revoke}
            onClose={() => setRevoking(null)}
          >
            <p>
              Vas a revocar la invitación de <strong>{revoking?.email}</strong>. Su link deja de funcionar y no se puede volver a abrir.
              Si hace falta, creá una nueva.
            </p>
          </ReasonDialog>
        </>
      ) : null}
    </>
  );
}
