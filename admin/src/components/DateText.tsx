import { formatDate, formatDateTime } from "../format";

type DateTextProps = {
  value: string | null | undefined;
  time?: boolean;
};

export function DateText({ value, time = false }: DateTextProps) {
  if (!value) return <span className="muted-text">—</span>;
  return <time dateTime={value}>{time ? formatDateTime(value) : formatDate(value)}</time>;
}
