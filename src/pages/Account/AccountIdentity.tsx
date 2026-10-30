import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { AccountView, SignInProvider } from "../../api/types";
import { Avatar } from "../../components/ui/Avatar";
import { Tag } from "../../components/ui/Tag";

const PROVIDER_NAMES: Partial<Record<SignInProvider, string>> = {
  GOOGLE: "Google",
  FACEBOOK: "Facebook",
};

function signInMethods(t: TFunction<"account">, account: AccountView): string[] {
  return [
    ...(account.hasPassword ? [t("identity.password")] : []),
    ...account.providers.map((provider) => PROVIDER_NAMES[provider] ?? t("identity.otherProvider")),
  ];
}

export function AccountIdentity({ account }: { account: AccountView }) {
  const { t } = useTranslation("account");
  const name = account.name?.trim() || account.email;
  return (
    <section className="panel account-identity" aria-label={t("identity.label")}>
      <Avatar name={name} size="lg" />
      <div className="account-identity-text">
        <p className="account-identity-name">{name}</p>
        <p className="account-identity-email">
          <span className="account-email">{account.email}</span>
        </p>
      </div>
      <div className="account-identity-methods">
        <span className="account-methods-label">{t("identity.signInWith")}</span>
        <ul className="account-methods" aria-label={t("identity.methods")}>
          {signInMethods(t, account).map((method) => (
            <li key={method}>
              <Tag>{method}</Tag>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
