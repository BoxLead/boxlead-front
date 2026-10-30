export type ConsumerPage = {
  to: string;
  label: string;
};

export type ConsumerPageKey = "withdrawal" | "cancellation";

export const CONSUMER_PAGES: readonly (ConsumerPage & { key: ConsumerPageKey })[] = [
  { to: "/arrepentimiento", label: "Botón de arrepentimiento", key: "withdrawal" },
  { to: "/baja", label: "Botón de baja de servicio", key: "cancellation" },
];
