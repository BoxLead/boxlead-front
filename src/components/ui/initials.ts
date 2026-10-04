const HUES = [208, 32, 152, 268, 340, 186, 12, 96];

export function initialsOf(name: string): string {
  const words = name
    .replace(/[@._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => /^\p{L}/u.test(word));
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? words[0].slice(0, 2) : `${words[0][0]}${words[1][0]}`;
  return letters.toLocaleUpperCase("es-AR");
}

export function hueOf(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return HUES[hash % HUES.length];
}
