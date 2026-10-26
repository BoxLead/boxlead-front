import { useState } from "react";
import type { BillingProfile } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { PackageIcon } from "../../components/icons/UiIcons";
import { Banner } from "../../components/ui/Banner";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/toast";
import { PROFILE_KEY } from "../../data/subscription";
import { useApiQuery } from "../../hooks/useApiQuery";
import { emptyProfile, formatCuit, vatConditionLabel } from "../../util/billingProfile";
import { ProfileForm } from "./ProfileForm";

type ProfileSectionProps = {
  complete: boolean;
  defaultEmail: string;
};

export function ProfileSection({ complete, defaultEmail }: ProfileSectionProps) {
  const toast = useToast();
  const profile = useApiQuery<BillingProfile>(complete ? PROFILE_KEY : null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const data = complete ? profile.data : undefined;

  const editButton = (
    <button
      type="button"
      className={data ? "btn btn-secondary btn-sm" : "btn btn-primary"}
      disabled={complete && !data}
      onClick={() => setEditing(true)}
    >
      {data ? "Editar" : "Cargar datos fiscales"}
    </button>
  );

  return (
    <section className="billing-section" aria-labelledby="billing-profile-title">
      <div className="billing-section-head">
        <h2 id="billing-profile-title" className="billing-section-title">
          Datos fiscales
        </h2>
        {data ? editButton : null}
      </div>
      {complete && profile.error && !profile.data ? (
        <Banner
          tone="danger"
          title="No pudimos cargar tus datos fiscales"
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void profile.reload()}>
              Reintentar
            </button>
          }
        >
          {profile.error}
        </Banner>
      ) : complete && profile.loading ? (
        <div className="panel skeleton billing-profile-skeleton" aria-hidden="true" />
      ) : data ? (
        <dl className="panel billing-profile">
          <div>
            <dt>Razón social</dt>
            <dd>{data.legalName}</dd>
          </div>
          <div>
            <dt>{data.taxIdType === "CUIT" ? "CUIT" : data.taxIdType}</dt>
            <dd>{data.taxIdType === "CUIT" ? formatCuit(data.taxId) : data.taxId}</dd>
          </div>
          <div>
            <dt>Condición frente al IVA</dt>
            <dd>{vatConditionLabel(data.vatCondition)}</dd>
          </div>
          <div>
            <dt>Domicilio</dt>
            <dd>{`${data.addressLine}, ${data.city}, ${data.province}, CP ${data.postalCode}`}</dd>
          </div>
          <div>
            <dt>Email para las facturas</dt>
            <dd>{data.billingEmail}</dd>
          </div>
        </dl>
      ) : (
        <div className="panel">
          <EmptyState
            icon={<PackageIcon />}
            title="Todavía no cargaste tus datos fiscales"
            hint="Los necesitamos para hacerte la factura antes del primer pago."
            action={editButton}
          />
        </div>
      )}

      <Dialog
        open={editing}
        title="Datos fiscales"
        description="Los usamos para hacerte la factura."
        size="lg"
        busy={busy}
        onClose={() => setEditing(false)}
      >
        <ProfileForm
          initial={data ?? emptyProfile(defaultEmail)}
          submitLabel="Guardar"
          onBusyChange={setBusy}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            toast({ message: "Guardaste tus datos fiscales." });
          }}
        />
      </Dialog>
    </section>
  );
}
