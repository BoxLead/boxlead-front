export type SocialProviderId = "google" | "facebook";

export type SocialProvider = {
  id: SocialProviderId;
  name: string;
  connection: string;
};

export const SOCIAL_AUTH_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN;
export const SOCIAL_AUTH_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID;
export const SOCIAL_AUTH_ENABLED = Boolean(SOCIAL_AUTH_DOMAIN && SOCIAL_AUTH_CLIENT_ID);

export const SOCIAL_CALLBACK_PATH = "/social/callback";

export const SOCIAL_PROVIDERS: readonly SocialProvider[] = [
  { id: "google", name: "Google", connection: "google-oauth2" },
  { id: "facebook", name: "Facebook", connection: "facebook" },
];

export function socialRedirectUri(origin: string): string {
  return `${origin}${SOCIAL_CALLBACK_PATH}`;
}
