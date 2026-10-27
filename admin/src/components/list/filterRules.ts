export const MIN_QUERY = 2;
export const MAX_QUERY = 200;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FilterRule =
  | { kind: "enum"; values: readonly string[] }
  | { kind: "date"; after?: string }
  | { kind: "uuid"; what: string }
  | { kind: "query" };

export type FilterRules = Readonly<Record<string, FilterRule>>;

export function isDay(value: string): boolean {
  return ISO_DAY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export const RANGE_PROBLEM = "La fecha de inicio tiene que ser anterior a la de fin.";

function problemOf(rule: FilterRule, values: readonly string[], valueOf: (key: string) => string): string | null {
  switch (rule.kind) {
    case "enum":
      return values.every((value) => rule.values.includes(value)) ? null : "Uno de los filtros tiene un valor que no es una opción. Limpialos y elegí de nuevo.";
    case "date": {
      if (!values.every(isDay)) return "Una de las fechas no tiene el formato correcto.";
      const start = rule.after ? valueOf(rule.after) : "";
      if (start && isDay(start) && values.some((value) => value < start)) return RANGE_PROBLEM;
      return null;
    }
    case "uuid":
      return values.every(isUuid) ? null : `El id ${rule.what} no tiene el formato correcto.`;
    case "query":
      return values.every((value) => value.trim().length >= MIN_QUERY && value.trim().length <= MAX_QUERY)
        ? null
        : `La búsqueda necesita entre ${MIN_QUERY} y ${MAX_QUERY} caracteres.`;
  }
}

export function filterProblem(rules: FilterRules, valuesOf: (key: string) => string[]): string | null {
  const valueOf = (key: string) => valuesOf(key)[0] ?? "";
  for (const [key, rule] of Object.entries(rules)) {
    const values = valuesOf(key);
    if (values.length === 0) continue;
    const problem = problemOf(rule, values, valueOf);
    if (problem) return problem;
  }
  return null;
}

export function enumOf(options: readonly { value: string }[]): FilterRule {
  return { kind: "enum", values: options.map((option) => option.value) };
}

export function dateRange(from: string, to: string): FilterRules {
  return { [from]: { kind: "date" }, [to]: { kind: "date", after: from } };
}
