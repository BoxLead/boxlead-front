import type { AccountOptions } from "./mock-api/account.ts";
import { expect, mockApiUrl } from "./support.ts";

type SentEmail = { template: string; to: string; token: string | null };

export async function setAccountOptions(options: Partial<AccountOptions>) {
  const res = await fetch(`${mockApiUrl()}/__account/options`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "boxlead-web" },
    body: JSON.stringify(options),
  });
  expect(res.ok).toBe(true);
}

export async function sentEmails(): Promise<SentEmail[]> {
  const res = await fetch(`${mockApiUrl()}/__account/sent`);
  expect(res.ok).toBe(true);
  return (await res.json()) as SentEmail[];
}

export async function lastToken(template: string): Promise<string> {
  const token = (await sentEmails()).filter((email) => email.template === template).at(-1)?.token;
  expect(token).toBeTruthy();
  return token ?? "";
}
