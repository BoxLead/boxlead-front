import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { AccountView } from "../../api/types";
import { NotificationSettings } from "../../components/NotificationSettings/NotificationSettings";
import { Banner } from "../../components/ui/Banner";
import { useAuth } from "../../context/auth";
import { ACCOUNT_KEY } from "../../data/account";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { AccountIdentity } from "./AccountIdentity";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { EmailSection } from "./EmailSection";
import { ProfileSection } from "./ProfileSection";
import { SessionsSection } from "./SessionsSection";
import { SignInSection } from "./SignInSection";
import "./Account.css";

export function Account() {
  const { t } = useTranslation("account");
  useDocumentTitle(t("title"));
  const id = useId();
  const { user } = useAuth();
  const account = useApiQuery<AccountView>(ACCOUNT_KEY);

  return (
    <div className="page account-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-header-desc">{t("description")}</p>
        </div>
      </header>

      {account.error && !account.data ? (
        <Banner
          tone="danger"
          title={t("loadFailed")}
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void account.reload()}>
              {t("retry")}
            </button>
          }
        >
          {account.error}
        </Banner>
      ) : !account.data ? (
        <div className="account-layout" aria-hidden="true">
          <div className="skeleton account-skeleton-identity" />
          <div className="skeleton account-skeleton" />
          <div className="skeleton account-skeleton" />
        </div>
      ) : (
        <div className="account-layout rise-list">
          <AccountIdentity account={account.data} />
          <section className="panel account-group" aria-labelledby={`${id}-data`}>
            <div className="account-group-head">
              <h2 id={`${id}-data`} className="panel-title">
                {t("yourData")}
              </h2>
            </div>
            <ProfileSection account={account.data} />
            <EmailSection account={account.data} />
          </section>
          <section className="panel account-group" aria-labelledby={`${id}-access`}>
            <div className="account-group-head">
              <h2 id={`${id}-access`} className="panel-title">
                {t("access")}
              </h2>
            </div>
            <SignInSection account={account.data} />
            {user?.account?.sessionRevocation ? <SessionsSection /> : null}
          </section>
          <NotificationSettings />
          {user?.account?.deletion ? <DeleteAccountSection account={account.data} /> : null}
        </div>
      )}
    </div>
  );
}
