export const VAT_CONDITIONS = [
  { value: "RESPONSABLE_INSCRIPTO", label: "Responsable inscripto" },
  { value: "MONOTRIBUTO", label: "Monotributo" },
  { value: "EXENTO", label: "Exento" },
  { value: "CONSUMIDOR_FINAL", label: "Consumidor final" },
] as const;

export function cuitDigits(value: string): string {
  return value.replace(/[\s.-]/g, "");
}

export function formatCuit(value: string): string {
  const digits = cuitDigits(value);
  if (!/^\d{11}$/.test(digits)) return value;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export function vatConditionLabel(value: string): string {
  return VAT_CONDITIONS.find((condition) => condition.value === value)?.label ?? value;
}
