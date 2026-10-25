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

export type ProviderEntry = {
  label: string;
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
    { label: "Razón social", value: provider.legalName },
    { label: "CUIT", value: provider.taxId },
    { label: "Domicilio", value: provider.address },
    { label: "Email de atención", value: provider.email, href: `mailto:${provider.email.trim()}` },
    { label: "Horario de atención", value: provider.hours },
  ];
  return entries
    .filter((entry) => filled(entry.value))
    .map((entry) => ({ ...entry, value: entry.value.trim() }));
}

export function dataFiscalBadge(url = DATA_FISCAL_URL, image = DATA_FISCAL_IMAGE): DataFiscalBadge | null {
  if (!filled(url) || !filled(image)) return null;
  return { url: url.trim(), image: image.trim() };
}
