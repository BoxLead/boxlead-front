import {
  DATA_FISCAL_IMAGE,
  DATA_FISCAL_URL,
  LEGAL_ENTITY_ADDRESS,
  LEGAL_ENTITY_NAME,
  LEGAL_ENTITY_TAX_ID,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
} from "../../util/company";

export type Provider = {
  legalName: string;
  taxId: string;
  address: string;
  email: string;
  hours: string;
};

export type ProviderLabel = "legalName" | "taxId" | "address" | "email" | "hours";

export type ProviderEntry = {
  label: ProviderLabel;
  value: string;
  href?: string;
};

export type DataFiscalBadge = {
  url: string;
  image: string;
};

export const PROVIDER: Provider = {
  legalName: LEGAL_ENTITY_NAME,
  taxId: LEGAL_ENTITY_TAX_ID,
  address: LEGAL_ENTITY_ADDRESS,
  email: SUPPORT_EMAIL,
  hours: SUPPORT_HOURS,
};

function filled(value: string): boolean {
  return value.trim() !== "";
}

export function providerEntries(provider: Provider): ProviderEntry[] {
  const entries: ProviderEntry[] = [
    { label: "legalName", value: provider.legalName },
    { label: "taxId", value: provider.taxId },
    { label: "address", value: provider.address },
    { label: "email", value: provider.email, href: `mailto:${provider.email.trim()}` },
    { label: "hours", value: provider.hours },
  ];
  return entries
    .filter((entry) => filled(entry.value))
    .map((entry) => ({ ...entry, value: entry.value.trim() }));
}

export function dataFiscalBadge(url = DATA_FISCAL_URL, image = DATA_FISCAL_IMAGE): DataFiscalBadge | null {
  if (!filled(url) || !filled(image)) return null;
  return { url: url.trim(), image: image.trim() };
}
