import type { AccountView, SignInProvider } from "../../api/types";
import { Avatar } from "../../components/ui/Avatar";
import { Tag } from "../../components/ui/Tag";

const PROVIDER_LABELS: Record<SignInProvider, string> = {
  GOOGLE: "Google",
  FACEBOOK: "Facebook",
  OTHER: "Otro proveedor",
};

function signInMethods(account: AccountView): string[] {
  return [
    ...(account.hasPassword ? ["Email y contraseña"] : []),
    ...account.providers.map((provider) => PROVIDER_LABELS[provider]),
  ];
}

export function AccountIdentity({ account }: { account: AccountView }) {
  const name = account.name?.trim() || account.email;
  return (
    <section className="panel account-identity" aria-label="Quién sos">
      <Avatar name={name} size="lg" />
      <div className="account-identity-text">
        <p className="account-identity-name">{name}</p>
        <p className="account-identity-email">
          <span className="account-email">{account.email}</span>
        </p>
      </div>
      <div className="account-identity-methods">
        <span className="account-methods-label">Entrás con</span>
        <ul className="account-methods" aria-label="Formas de entrar">
          {signInMethods(account).map((method) => (
            <li key={method}>
              <Tag>{method}</Tag>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
