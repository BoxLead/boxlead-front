export const CODE_LENGTH = 6;

export function isCompleteCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}
