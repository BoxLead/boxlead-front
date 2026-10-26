export function serializeJsonLd(graph: Record<string, unknown>[]): string {
  const document = { "@context": "https://schema.org", "@graph": graph };
  return JSON.stringify(document).replace(/</g, "\\u003c");
}
