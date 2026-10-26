/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = dirname(fileURLToPath(import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) ? [path] : [];
  });
}

describe("backoffice isolation", () => {
  it("keeps nothing in the browser storage and loads no third party code", () => {
    const offending = sources(ROOT).filter((file) =>
      /\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b|https?:\/\/(?!localhost)/.test(readFileSync(file, "utf8")),
    );
    expect(offending.map((file) => relative(ROOT, file))).toEqual([]);
  });
});
