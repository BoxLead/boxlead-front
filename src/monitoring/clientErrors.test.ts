import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../api/client";
import {
  CLIENT_ERRORS_PATH,
  createClientErrorReporter,
  MAX_REPORTS,
  startClientErrorReporting,
  type ClientErrorReport,
} from "./clientErrors";

const ORIGIN = "https://boxlead.app";

function setup(send: (report: ClientErrorReport) => Promise<void> = () => Promise.resolve()) {
  const sent = vi.fn(send);
  const reporter = createClientErrorReporter({
    send: sent,
    origin: () => ORIGIN,
    pathname: () => "/app/leads/0b0e0000-0000-4000-8000-000000000001",
    release: "abc123",
  });
  return { reporter, sent };
}

function flush() {
  return new Promise((settle) => setTimeout(settle, 0));
}

describe("createClientErrorReporter", () => {
  it("sends nothing until the flag turns it on and nothing after it turns off", () => {
    const { reporter, sent } = setup();
    reporter.report("error", new Error("before"));
    reporter.setEnabled(true);
    reporter.report("error", new Error("during"));
    reporter.setEnabled(false);
    reporter.report("error", new Error("after"));
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent).toHaveBeenCalledWith({ kind: "error", message: "during", route: "/app/leads/:id", release: "abc123" });
  });

  it("sends the sanitized message", () => {
    const { reporter, sent } = setup();
    reporter.setEnabled(true);
    reporter.report("unhandledrejection", new Error("No lead for ana@negocio.com at https://api.boxlead.app/x?t=1"));
    expect(sent.mock.calls[0][0].message).toBe("No lead for [email] at https://api.boxlead.app/x");
  });

  it("sends each message once", () => {
    const { reporter, sent } = setup();
    reporter.setEnabled(true);
    reporter.report("error", new Error("same"));
    reporter.report("boundary", new Error("same"));
    reporter.report("error", new Error("Lead 1234567 broke"));
    reporter.report("error", new Error("Lead 7654321 broke"));
    expect(sent).toHaveBeenCalledTimes(2);
  });

  it("stops at the cap for the page load", () => {
    const { reporter, sent } = setup();
    reporter.setEnabled(true);
    for (let index = 0; index < MAX_REPORTS + 5; index += 1) reporter.report("error", new Error(`error ${index}`));
    expect(sent).toHaveBeenCalledTimes(MAX_REPORTS);
  });

  it.each([404, 429])("stops for the page load after a %i", async (status) => {
    const { reporter, sent } = setup(() => Promise.reject(new ApiError("no", status)));
    reporter.setEnabled(true);
    reporter.report("error", new Error("first"));
    await flush();
    reporter.report("error", new Error("second"));
    expect(sent).toHaveBeenCalledTimes(1);
  });

  it("keeps going after a network failure without retrying", async () => {
    const { reporter, sent } = setup(() => Promise.reject(new TypeError("Failed to fetch")));
    reporter.setEnabled(true);
    reporter.report("error", new Error("first"));
    await flush();
    reporter.report("error", new Error("first"));
    reporter.report("error", new Error("second"));
    expect(sent).toHaveBeenCalledTimes(2);
  });

  it("ignores chunk load errors, opaque script errors and errors from other origins", () => {
    const { reporter, sent } = setup();
    reporter.setEnabled(true);
    reporter.report("unhandledrejection", new TypeError("Failed to fetch dynamically imported module: /assets/Leads.js"));
    reporter.report("error", "Script error.");
    reporter.report("error", new Error("from extension"), { filename: "chrome-extension://abc/content.js" });
    reporter.report("error", new Error("from sdk"), { filename: "https://connect.facebook.net/sdk.js" });
    const injected = new Error("injected");
    injected.stack = "Error: injected\n    at x (moz-extension://abc/inject.js:1:1)";
    reporter.report("unhandledrejection", injected);
    reporter.report("error", new Error("ours"), { filename: `${ORIGIN}/assets/index.js` });
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent.mock.calls[0][0].message).toBe("ours");
  });

  it("never throws", () => {
    const { reporter } = setup(() => {
      throw new Error("send exploded");
    });
    reporter.setEnabled(true);
    expect(() => reporter.report("error", new Error("x"))).not.toThrow();
    const hostile = {
      get name(): string {
        throw new Error("getter");
      },
    };
    expect(() => reporter.report("error", Object.setPrototypeOf(hostile, Error.prototype))).not.toThrow();
  });
});

function swallow(event: Event) {
  event.preventDefault();
}

describe("startClientErrorReporting", () => {
  beforeEach(() => {
    window.addEventListener("error", swallow);
  });

  afterEach(() => {
    window.removeEventListener("error", swallow);
    vi.restoreAllMocks();
  });

  it("listens to window errors and rejections only while started", () => {
    const report = vi.spyOn(api, "report").mockResolvedValue(undefined);
    const stop = startClientErrorReporting();
    window.dispatchEvent(new ErrorEvent("error", { message: "boom", error: new Error("boom") }));
    const rejection = new Event("unhandledrejection");
    Object.assign(rejection, { reason: new Error("rejected"), promise: Promise.resolve() });
    window.dispatchEvent(rejection);
    stop();
    window.dispatchEvent(new ErrorEvent("error", { message: "later", error: new Error("later") }));
    expect(report.mock.calls.map(([path, body]) => [path, (body as ClientErrorReport).kind])).toEqual([
      [CLIENT_ERRORS_PATH, "error"],
      [CLIENT_ERRORS_PATH, "unhandledrejection"],
    ]);
  });
});
