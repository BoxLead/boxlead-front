export const MIN_REASON = 10;
export const MAX_REASON = 500;

export function reasonProblem(reason: string): string | null {
  const length = reason.trim().length;
  if (length < MIN_REASON) return `El motivo necesita al menos ${MIN_REASON} caracteres.`;
  if (length > MAX_REASON) return `El motivo puede tener hasta ${MAX_REASON} caracteres.`;
  return null;
}
