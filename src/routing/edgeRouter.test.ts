/// <reference types="node" />
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { resolveRequest } from "../../scripts/staticSite.ts";

type QueryEntry = { value: string; multiValue?: { value: string }[] };
type EdgeRequest = { uri: string; querystring: Record<string, QueryEntry> };
type EdgeResponse = { statusCode: number; headers: { location: { value: string } } };
type Handler = (event: { request: EdgeRequest }) => EdgeRequest | EdgeResponse;

const ROUTER = resolve(dirname(fileURLToPath(import.meta.url)), "../../terraform/functions/router.js");

function loadRouter(): Handler {
  const context: { handler?: Handler } = {};
  runInNewContext(`${readFileSync(ROUTER, "utf8")}\nthis.handler = handler;`, context);
  if (!context.handler) throw new Error("router.js has no handler");
  return context.handler;
}

const handler = loadRouter();

function route(uri: string, querystring: Record<string, QueryEntry> = {}): EdgeRequest | EdgeResponse {
  return handler({ request: { uri, querystring } });
}

function locationOf(uri: string, querystring: Record<string, QueryEntry> = {}): string | null {
  const result = route(uri, querystring);
  return "statusCode" in result ? result.headers.location.value : null;
}

const exists = () => true;

describe("edge router", () => {
  it("keeps the redirect table of the clean URLs", () => {
    expect(locationOf("/privacidad/")).toBe("/privacidad");
    expect(locationOf("/index.html")).toBe("/");
    expect(locationOf("/terminos.html")).toBe("/terminos");
    expect(locationOf("/privacidad/", { a: { value: "1 2" } })).toBe("/privacidad?a=1%202");
  });

  it("serves pages, the app shell and the 404 without redirecting", () => {
    expect(route("/")).toMatchObject({ uri: "/" });
    expect(route("/privacidad")).toMatchObject({ uri: "/privacidad.html" });
    expect(route("/app/inbox")).toMatchObject({ uri: "/app.html" });
    expect(route("/app.html")).toMatchObject({ uri: "/404.html" });
    expect(route("/favicon.svg")).toMatchObject({ uri: "/favicon.svg" });
  });

  it("never redirects to another host", () => {
    for (const uri of ["//evil.example/", "//evil.example/login.html", "/\\evil.example/", "/\\/evil.example.html", "///evil.example//", "//"]) {
      const location = locationOf(uri, { next: { value: "x" } });
      expect(location, uri).toMatch(/^\/[^/\\]/);
    }
    expect(locationOf("//evil.example/")).toBe("/evil.example");
    expect(locationOf("//evil.example/login.html")).toBe("/evil.example/login");
    expect(locationOf("/\\evil.example/")).toBe("/evil.example");
  });

  it("matches the preview server on every redirect", () => {
    for (const uri of ["/privacidad/", "/index.html", "/terminos.html", "//evil.example/", "//evil.example/login.html", "/\\evil.example/", "//"]) {
      const preview = resolveRequest(uri, exists);
      expect(preview.kind, uri).toBe("redirect");
      expect(preview.kind === "redirect" ? preview.location : null, uri).toBe(locationOf(uri));
    }
  });
});
