import "i18next";
import type auth from "./messages/es/auth.json";
import type channels from "./messages/es/channels.json";
import type common from "./messages/es/common.json";
import type landing from "./messages/es/landing.json";
import type seo from "./messages/es/seo.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
      landing: typeof landing;
      channels: typeof channels;
      seo: typeof seo;
      auth: typeof auth;
    };
  }
}
