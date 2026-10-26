/// <reference types="node" />
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { auditCss, auditTree } from "./cssScale";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("design scale guardian", () => {
  it("flags literals that bypass the tokens", () => {
    const css = `
.a {
  color: #ffffff;
  font-size: 13px;
  padding: 10px 12px;
  border-radius: 7px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 999;
  transition: opacity 0.3s ease;
}
`;
    const reasons = auditCss(css, "src/x.css").map((f) => f.reason);
    expect(reasons).toEqual([
      "colour literal outside the tokens",
      "font size outside the type scale",
      "spacing outside the 4 px scale",
      "radius outside the scale",
      "shadow outside the elevation scale",
      "z-index outside the layers",
      "duration outside the motion scale",
    ]);
  });

  it("accepts values that come from the tokens", () => {
    const css = `
.a {
  color: var(--signal-heading);
  font-size: var(--signal-text-sm);
  padding: var(--signal-space-3) 0;
  border-radius: var(--signal-radius-md);
  box-shadow: var(--signal-edge), var(--signal-shadow-2);
  z-index: var(--signal-z-popover);
  transition:
    opacity var(--signal-duration-base) var(--signal-ease-out),
    transform var(--signal-duration-base) var(--signal-ease-out);
  animation: marquee 38s linear infinite;
  background: hsl(var(--avatar-hue) 45% 26%);
}
`;
    expect(auditCss(css, "src/x.css")).toEqual([]);
  });

  it("keeps every stylesheet of src on the scale", () => {
    const findings = auditTree(resolve(REPO, "src"), REPO);
    const report = findings.map((f) => `${f.file}:${f.line} ${f.property}: ${f.value} (${f.reason})`);
    expect(report).toEqual([]);
  });
});
