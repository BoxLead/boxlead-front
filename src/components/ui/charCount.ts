export function counterTone(length: number, max: number): "ok" | "near" | "over" {
  if (length > max) return "over";
  if (length >= max * 0.9) return "near";
  return "ok";
}
