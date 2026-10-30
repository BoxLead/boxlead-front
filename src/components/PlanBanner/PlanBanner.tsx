import { useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import type { Invitation } from "../../api/types";
import { useAuth } from "../../context/auth";
import { acceptInvitation, CURRENT_INVITATION_KEY } from "../../data/billing";
import { dismissPlanError, lastPlanError, subscribePlanErrors } from "../../data/planErrors";
import { invalidateQueries } from "../../data/queryCache";
import { useApiQuery } from "../../hooks/useApiQuery";
import { usePlan } from "../../hooks/usePlan";
import { acceptInvitationError } from "../../util/invitation";
import { CloseIcon } from "../icons/UiIcons";
import { Banner } from "../ui/Banner";
import { useToast } from "../ui/toast";
import { PlanLink } from "./PlanLink";
import { planErrorNotice, planNotice } from "./planNotice";
import "./PlanBanner.css";

export function PlanBanner() {
  const { t } = useTranslation("shell");
  const { user, refreshUser } = useAuth();
  const plan = usePlan();
  const toast = useToast();
  const planError = useSyncExternalStore(subscribePlanErrors, lastPlanError);
  const summary = plan.summary;
  const invitation = useApiQuery<Invitation>(summary && !summary.demo ? CURRENT_INVITATION_KEY : null);
  const [accepting, setAccepting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  if (!plan.billing) return null;

  const notice = summary ? planNotice(summary) : null;
  const errorNotice = planError ? planErrorNotice(planError, notice) : null;
  const invited = summary && !summary.demo ? invitation.data : undefined;
  const otherEmail = invited && user && invited.email.toLowerCase() !== user.email.toLowerCase();

  async function accept() {
    setAccepting(true);
    setInviteError(null);
    try {
      await acceptInvitation();
      toast({ message: t("plan.invitation.accepted") });
      void invalidateQueries(CURRENT_INVITATION_KEY);
      void refreshUser().catch(() => undefined);
    } catch (error) {
      setInviteError(acceptInvitationError(error, invited?.email ?? null));
    } finally {
      setAccepting(false);
    }
  }

  if (!notice && !errorNotice && !invited) return null;

  return (
    <div className="plan-banners">
      {notice ? (
        <Banner tone={notice.tone} title={notice.title} action={<PlanLink action={notice.action} />}>
          {notice.text}
        </Banner>
      ) : null}
      {errorNotice ? (
        <Banner
          tone="warning"
          title={errorNotice.title}
          action={
            <div className="plan-banner-actions">
              <PlanLink action={errorNotice.action} />
              <button type="button" className="btn btn-icon btn-sm" aria-label={t("closeNotice")} onClick={dismissPlanError}>
                <CloseIcon width={16} height={16} />
              </button>
            </div>
          }
        >
          {errorNotice.text}
        </Banner>
      ) : null}
      {invited ? (
        <Banner
          tone={inviteError ? "danger" : "info"}
          title={t("plan.invitation.title")}
          action={
            <button type="button" className="btn btn-secondary btn-sm" disabled={accepting} onClick={() => void accept()}>
              {accepting ? t("plan.invitation.accepting") : t("plan.invitation.accept")}
            </button>
          }
        >
          {inviteError ??
            (otherEmail
              ? t("plan.invitation.otherEmail", { email: invited.email, current: user.email })
              : t("plan.invitation.forEmail", { email: invited.email }))}
        </Banner>
      ) : null}
    </div>
  );
}
