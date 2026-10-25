import { PRODUCT_NAME } from "../util/company";

export function pageNameFrom(title: string): string {
  const suffix = ` · ${PRODUCT_NAME}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
}
