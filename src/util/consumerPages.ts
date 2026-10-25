export type ConsumerPage = {
  to: string;
  label: string;
};

export const CONSUMER_PAGES: readonly ConsumerPage[] = [
  { to: "/arrepentimiento", label: "Botón de arrepentimiento" },
  { to: "/baja", label: "Botón de baja de servicio" },
];
