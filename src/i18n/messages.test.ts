import { describe, expect, it } from "vitest";
import { LANGUAGES } from "./languages";

const files = import.meta.glob<{ default: unknown }>("./messages/*/*.json", { eager: true });

function flatten(value: unknown, prefix = ""): Map<string, string> {
  const entries = new Map<string, string>();
  if (typeof value === "string") {
    entries.set(prefix, value);
    return entries;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      for (const [path, text] of flatten(child, prefix ? `${prefix}.${key}` : key)) entries.set(path, text);
    }
  }
  return entries;
}

function messages(language: string): Map<string, Map<string, string>> {
  const byNamespace = new Map<string, Map<string, string>>();
  for (const [file, module] of Object.entries(files)) {
    const [, fileLanguage, namespace] = /\.\/messages\/([^/]+)\/([^/]+)\.json$/.exec(file) ?? [];
    if (fileLanguage === language) byNamespace.set(namespace, flatten(module.default));
  }
  return byNamespace;
}

function variables(text: string): string[] {
  return [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1]).sort();
}

const [base, ...others] = LANGUAGES;
const reference = messages(base);

describe("message files", () => {
  it("has files for the default language", () => {
    expect(reference.size).toBeGreaterThan(0);
  });

  for (const language of others) {
    const translated = messages(language);

    it(`has the same namespaces in ${base} and ${language}`, () => {
      expect([...translated.keys()].sort()).toEqual([...reference.keys()].sort());
    });

    for (const [namespace, keys] of reference) {
      it(`has the same keys in ${base}/${namespace} and ${language}/${namespace}`, () => {
        const other = translated.get(namespace) ?? new Map<string, string>();
        expect([...other.keys()].filter((key) => !keys.has(key)), `only in ${language}`).toEqual([]);
        expect([...keys.keys()].filter((key) => !other.has(key)), `only in ${base}`).toEqual([]);
      });

      it(`keeps the same variables and no empty text in ${language}/${namespace}`, () => {
        const other = translated.get(namespace) ?? new Map<string, string>();
        for (const [key, text] of keys) {
          const translation = other.get(key);
          if (translation === undefined) continue;
          expect(translation.trim(), `${language}/${namespace}:${key}`).not.toBe("");
          expect(variables(translation), `${language}/${namespace}:${key}`).toEqual(variables(text));
        }
      });
    }
  }
});
