export type RichPart = string | { label: string; href: string };

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseRich(text: string): RichPart[] {
  const parts: RichPart[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    parts.push({ label: match[1], href: match[2] });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function plainText(text: string): string {
  return parseRich(text)
    .map((part) => (typeof part === "string" ? part : part.label))
    .join("");
}
