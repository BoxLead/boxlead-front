import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { BillingProfile } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { PackageIcon } from "../../components/icons/UiIcons";
import { Banner } from "../../components/ui/Banner";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/toast";
import { PROFILE_KEY } from "../../data/subscription";
import { useApiQuery } from "../../hooks/useApiQuery";
import { emptyProfile, formatCuit } from "../../util/billingProfile";
import { vatConditionName } from "./billingLabels";
import { ProfileForm } from "./ProfileForm";

type ProfileSectionProps = {
  complete: boolean;
  defaultEmail: string;
};

export function ProfileSection({ complete, defaultEmail }: ProfileSectionProps) {
  const { t } = useTranslation("billing");
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
      {data ? t("profile.edit") : t("profile.add")}
    </button>
  );

  return (
    <section className="billing-section" aria-labelledby="billing-profile-title">
      <div className="billing-section-head">
        <h2 id="billing-profile-title" className="billing-section-title">
          {t("profile.title")}
        </h2>
        {data ? editButton : null}
      </div>
      {complete && profile.error && !profile.data ? (
        <Banner
          tone="danger"
          title={t("profile.loadFailed")}
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void profile.reload()}>
              {t("retry")}
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
            <dt>{t("profile.legalName")}</dt>
            <dd>{data.legalName}</dd>
          </div>
          <div>
            <dt>{data.taxIdType === "CUIT" ? "CUIT" : data.taxIdType}</dt>
            <dd>{data.taxIdType === "CUIT" ? formatCuit(data.taxId) : data.taxId}</dd>
          </div>
          <div>
            <dt>{t("profile.vatCondition")}</dt>
            <dd>{vatConditionName(data.vatCondition)}</dd>
          </div>
          <div>
            <dt>{t("profile.address")}</dt>
            <dd>
              {t("profile.addressValue", {
                addressLine: data.addressLine,
                city: data.city,
                province: data.province,
                postalCode: data.postalCode,
              })}
            </dd>
          </div>
          <div>
            <dt>{t("profile.billingEmail")}</dt>
            <dd>{data.billingEmail}</dd>
          </div>
        </dl>
      ) : (
        <div className="panel">
          <EmptyState
            icon={<PackageIcon />}
            title={t("profile.empty")}
            hint={t("profile.emptyHint")}
            action={editButton}
          />
        </div>
      )}

      <Dialog
        open={editing}
        title={t("profile.title")}
        description={t("profile.dialogDescription")}
        size="lg"
        busy={busy}
        onClose={() => setEditing(false)}
      >
        <ProfileForm
          initial={data ?? emptyProfile(defaultEmail)}
          submitLabel={t("profile.save")}
          onBusyChange={setBusy}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            toast({ message: t("profile.saved") });
          }}
        />
      </Dialog>
    </section>
  );
}
