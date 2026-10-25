import { useState } from "react";
import type { LegalVersion } from "../../api/types";
import { useSocialLogin } from "../../hooks/useSocialLogin";
import type { SocialProvider } from "../../util/social";
import { SocialIcon } from "../icons/SocialIcons";

const START_ERROR = "No pudimos abrir el inicio de sesión. Probá de nuevo.";

type SocialButtonsProps = {
  next: string;
  acceptedLegal?: LegalVersion[];
  canStart?: () => boolean;
};

export function SocialButtons({ next, acceptedLegal, canStart }: SocialButtonsProps) {
  const { enabled, providers, start } = useSocialLogin();
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return null;

  async function handleClick(provider: SocialProvider) {
    setError(null);
    if (canStart && !canStart()) return;
    setStarting(provider.id);
    try {
      await start(provider, next, acceptedLegal);
    } catch {
      setStarting(null);
      setError(START_ERROR);
    }
  }

  return (
    <>
      <div className="auth-social">
        {error ? (
          <div className="auth-error" role="alert">
            {error}
          </div>
        ) : null}
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            className="auth-social-btn"
            disabled={starting !== null}
            onClick={() => void handleClick(provider)}
          >
            <SocialIcon provider={provider.id} />
            Continuar con {provider.name}
          </button>
        ))}
      </div>
      <div className="auth-divider" role="separator">
        <span>o con tu email</span>
      </div>
    </>
  );
}
