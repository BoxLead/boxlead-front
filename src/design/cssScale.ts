/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type Finding = { file: string; line: number; property: string; value: string; reason: string };

export const PENDING_MIGRATION = [
  "src/pages/Billing/",
  "src/pages/Reseller/",
  "src/pages/Invitation/",
  "src/pages/ConsumerRequest/",
  "src/pages/Legal/",
  "src/pages/Register/",
  "src/pages/SocialCallback/",
  "src/components/PlanBanner/",
  "src/components/PlanPicker/",
  "src/components/LegalDialog/",
  "src/components/Layout/",
  "src/components/ProviderDetails/",
  "src/landing/components/Header.css",
  "src/landing/components/Footer.css",
  "src/landing/components/PlansSection.css",
  "src/landing/components/DataFiscal.css",
];

export const TOKEN_FILES = ["src/index.css", "src/landing/LandingPage.css"];

export const EXCEPTIONS: Record<string, string[]> = {
  "src/components/Sidebar/Sidebar.css": ["margin: -1px"],
  "src/index.css": ["margin: -1px"],
  "src/pages/Inbox/ConversationView.css": ["margin: 0 0 var(--signal-space-sm)"],
  "src/routing/NotFound.css": ["font-size: clamp(9rem, 32vw, 18rem)"],
  "src/landing/LandingPage.css": ["transition-delay: 0s"],
  "src/landing/components/HeroSection.css": ["box-shadow: 0 0 0 0 color-mix(in srgb, var(--landing-success) 50%, transparent)", "box-shadow: 0 0 0 7px transparent"],
  "src/landing/components/ProductOverview.css": ["box-shadow: 0 0 0 7px transparent", "box-shadow: 0 0 0 0 transparent"],
  "src/pages/Metrics/Signals.css": ["box-shadow: 0 0 0 7px transparent"],
};

const SPACING_PROPS = /^(padding|margin|gap|row-gap|column-gap|padding-(top|right|bottom|left|block|inline)|margin-(top|right|bottom|left|block|inline)|inset|scroll-margin|scroll-margin-top)$/;
const AMBIENT_MS = 1500;

export function cssFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith(".css")) out.push(path);
    }
  };
  walk(root);
  return out.sort();
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, " "));
}

function stripUrls(value: string): string {
  return value.replace(/url\([^)]*\)/g, "url()");
}

function durationMs(token: string): number | null {
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(token);
  if (!match) return null;
  return match[2] === "s" ? Number(match[1]) * 1000 : Number(match[1]);
}

export function auditCss(css: string, repoRelative: string): Finding[] {
  const findings: Finding[] = [];
  const tokenFile = TOKEN_FILES.includes(repoRelative);
  const allowed = new Set(EXCEPTIONS[repoRelative] ?? []);
  const lines = stripComments(css).split("\n");
  let pendingTransition = "";
  let pendingLine = 0;
  const report = (line: number, property: string, value: string, reason: string) => {
    if (allowed.has(`${property}: ${value}`)) return;
    findings.push({ file: repoRelative, line, property, value, reason });
  };
  const checkDeclaration = (line: number, property: string, rawValue: string) => {
    const value = stripUrls(rawValue.trim());
    if (property.startsWith("--")) return;
    if (property !== "box-shadow" && /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?)\(/.test(value) && !/var\(--/.test(value) && !tokenFile) {
      report(line, property, value, "colour literal outside the tokens");
    }
    if (property === "font-size" && /\d(px|rem)\b/.test(value) && !/var\(--signal-text-/.test(value) && !tokenFile) {
      report(line, property, value, "font size outside the type scale");
    }
    if (SPACING_PROPS.test(property)) {
      for (const part of value.split(/\s+/)) {
        if (/^-?\d*\.?\d+(px|rem)$/.test(part) && part !== "0" && part !== "1px" && part !== "-1px" && !tokenFile) {
          report(line, property, value, "spacing outside the 4 px scale");
          break;
        }
      }
    }
    if (property === "border-radius" && /\d(px|rem|%)\b/.test(value) && !/var\(--/.test(value) && !tokenFile) {
      report(line, property, value, "radius outside the scale");
    }
    if (property === "box-shadow" && value !== "none" && !/var\(--/.test(value)) {
      report(line, property, value, "shadow outside the elevation scale");
    }
    if (property === "z-index" && !/var\(--signal-z-/.test(value) && value !== "-1" && value !== "auto" && value !== "0") {
      report(line, property, value, "z-index outside the layers");
    }
    if (/^(transition|animation|transition-duration|animation-duration)$/.test(property)) {
      for (const part of value.replace(/,/g, " ").split(/\s+/)) {
        const ms = durationMs(part);
        if (ms !== null && ms < AMBIENT_MS && ms !== 0) {
          report(line, property, value, "duration outside the motion scale");
          break;
        }
      }
    }
  };
  lines.forEach((raw, index) => {
    const line = index + 1;
    if (pendingTransition) {
      pendingTransition += ` ${raw.trim()}`;
      if (raw.trim().endsWith(";")) {
        const [property, ...rest] = pendingTransition.split(":");
        checkDeclaration(pendingLine, property.trim(), rest.join(":").replace(/;$/, ""));
        pendingTransition = "";
      }
      return;
    }
    const match = /^\s*([a-z-]+)\s*:\s*(.*)$/.exec(raw);
    if (!match) return;
    const [, property, value] = match;
    if (value.trim() === "") {
      pendingTransition = `${property}:`;
      pendingLine = line;
      return;
    }
    if (!value.trim().endsWith(";")) {
      pendingTransition = `${property}: ${value.trim()}`;
      pendingLine = line;
      return;
    }
    checkDeclaration(line, property, value.replace(/;$/, ""));
  });
  return findings;
}

export function auditTree(root: string, repoRoot: string): Finding[] {
  const findings: Finding[] = [];
  for (const file of cssFiles(root)) {
    const repoRelative = relative(repoRoot, file);
    if (PENDING_MIGRATION.some((prefix) => repoRelative.startsWith(prefix))) continue;
    findings.push(...auditCss(readFileSync(file, "utf8"), repoRelative));
  }
  return findings;
}
