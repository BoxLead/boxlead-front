import { SOCIAL_AUTH_ENABLED } from "../util/social";

const SOCIAL_ROUTES = /^\/(login|register|invitacion|reingresar)(\/|$)/;

export function needsSocialAuth(pathname: string, callbackPath: string): boolean {
  return SOCIAL_ROUTES.test(pathname) || pathname === callbackPath;
}

export function preloadSocialAuth(): Promise<void> {
  if (!SOCIAL_AUTH_ENABLED) return Promise.resolve();
  return import("./Auth0Boundary").then(() => undefined, () => undefined);
}
