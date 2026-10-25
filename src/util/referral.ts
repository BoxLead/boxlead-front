export const REFERRAL_COOKIE = "boxlead_ref";
export const REFERRAL_PARAM = "ref";
export const ATTRIBUTION_WINDOW_DAYS = 60;

const CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{10}$/;
const PARENT_DOMAIN = "boxlead.app";
const SECONDS_PER_DAY = 86_400;

export function parseReferralCode(value: string | null): string | null {
  if (value === null) return null;
  const code = value.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

export function hasReferralCookie(cookies: string): boolean {
  return cookies.split(";").some((cookie) => cookie.trim().startsWith(`${REFERRAL_COOKIE}=`));
}

export function referralCookieDomain(hostname: string): string | null {
  const host = hostname.toLowerCase();
  return host === PARENT_DOMAIN || host.endsWith(`.${PARENT_DOMAIN}`) ? `.${PARENT_DOMAIN}` : null;
}

export function referralCookie(code: string, hostname: string): string {
  const domain = referralCookieDomain(hostname);
  return [
    `${REFERRAL_COOKIE}=${code}`,
    "Path=/",
    `Max-Age=${ATTRIBUTION_WINDOW_DAYS * SECONDS_PER_DAY}`,
    ...(domain ? [`Domain=${domain}`] : []),
    "Secure",
    "SameSite=Lax",
  ].join("; ");
}

export function captureReferral(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(REFERRAL_PARAM)) return;
  const code = parseReferralCode(url.searchParams.get(REFERRAL_PARAM));
  if (code && !hasReferralCookie(document.cookie)) {
    document.cookie = referralCookie(code, url.hostname);
  }
  url.searchParams.delete(REFERRAL_PARAM);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
