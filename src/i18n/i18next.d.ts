import "i18next";
import type shell from "./messages/es/shell.json";
import type inbox from "./messages/es/inbox.json";
import type leads from "./messages/es/leads.json";
import type metrics from "./messages/es/metrics.json";
import type billing from "./messages/es/billing.json";
import type agents from "./messages/es/agents.json";
import type account from "./messages/es/account.json";
import type connections from "./messages/es/connections.json";
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
      shell: typeof shell;
      inbox: typeof inbox;
      leads: typeof leads;
      metrics: typeof metrics;
      billing: typeof billing;
      agents: typeof agents;
      account: typeof account;
      connections: typeof connections;
    };
  }
}
