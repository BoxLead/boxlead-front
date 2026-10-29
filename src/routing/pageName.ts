import { PRODUCT_NAME } from "../util/company";

const BADGE = /^\(\d+\+?\) /;

export function pageNameFrom(title: string): string {
  const suffix = ` · ${PRODUCT_NAME}`;
  const name = title.replace(BADGE, "");
  return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}
