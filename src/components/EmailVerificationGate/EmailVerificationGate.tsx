import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { useAuth } from "../../context/auth";
import { resendEmailVerification } from "../../data/account";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import "./EmailVerificationGate.css";

type Resend = { status: "idle" | "sending" | "sent" } | { status: "error"; message: string };

export function EmailVerificationGate() {
  const { t } = useTranslation("shell");
  const { user, logout, refreshUser } = useAuth();
  const [resend, setResend] = useState<Resend>({ status: "idle" });
  const [checking, setChecking] = useState(false);
  useDocumentTitle(t("emailGate.title"));

  async function sendAgain() {
    setResend({ status: "sending" });
    try {
      await resendEmailVerification();
      setResend({ status: "sent" });
    } catch (error) {
      setResend({
        status: "error",
        message:
          error instanceof ApiError && error.status === 429
            ? error.message
            : t("emailGate.resendFailed"),
      });
    }
  }

  async function checkAgain() {
    setChecking(true);
    await refreshUser().catch(() => undefined);
    setChecking(false);
  }

  return (
    <section className="page email-gate" aria-labelledby="email-gate-title">
      <div className="panel email-gate-panel">
        <h1 id="email-gate-title" className="page-title">
          {t("emailGate.title")}
        </h1>
        <p className="email-gate-text">
          <Trans
            t={t}
            i18nKey="emailGate.text"
            values={{ email: user?.email ?? "" }}
            components={{ strong: <strong className="email-gate-email" /> }}
          />
        </p>
        {resend.status === "sent" ? (
          <p className="email-gate-text" role="status">
            {t("emailGate.resent")}
          </p>
        ) : null}
        {resend.status === "error" ? (
          <p className="form-error" role="alert">
            {resend.message}
          </p>
        ) : null}
        <div className="email-gate-actions">
          <button type="button" className="btn btn-primary" onClick={checkAgain} disabled={checking}>
            {checking ? t("emailGate.checking") : t("emailGate.confirmed")}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={sendAgain}
            disabled={resend.status === "sending"}
          >
            {resend.status === "sending" ? t("emailGate.sending") : t("emailGate.resend")}
          </button>
        </div>
        <p className="email-gate-footer">
          {user?.account?.settings ? (
            <>
              <Trans t={t} i18nKey="emailGate.wrongEmail" components={{ account: <Link to="/app/cuenta" /> }} />{" "}
            </>
          ) : null}
          <button type="button" className="email-gate-logout" onClick={logout}>
            {t("logout")}
          </button>
        </p>
      </div>
    </section>
  );
}
