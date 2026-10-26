export function longDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) });
}
