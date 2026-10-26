import { describe, expect, it, vi } from "vitest";
import { CHUNK_RELOAD_KEY, isChunkLoadError, loadChunk } from "./chunkRetry";

const chunkError = () => new TypeError("Failed to fetch dynamically imported module: /assets/Inbox-abc.js");

describe("isChunkLoadError", () => {
  it("recognises the browser messages for a missing chunk", () => {
    expect(isChunkLoadError(chunkError())).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new Error("Unable to preload CSS for /assets/x.css"))).toBe(true);
    expect(isChunkLoadError(new Error("boom"))).toBe(false);
    expect(isChunkLoadError("nope")).toBe(false);
  });
});

describe("loadChunk", () => {
  it("returns the module and clears the reload mark", async () => {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    await expect(loadChunk(() => Promise.resolve({ ok: true }))).resolves.toEqual({ ok: true });
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBeNull();
  });

  it("reloads once when a chunk is missing after a deploy", async () => {
    const reload = vi.fn();
    const pending = loadChunk(() => Promise.reject(chunkError()), reload);
    await Promise.resolve();
    await Promise.resolve();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).not.toBeNull();
    void pending;
  });

  it("does not reload twice in a row", async () => {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    const reload = vi.fn();
    await expect(loadChunk(() => Promise.reject(chunkError()), reload)).rejects.toThrow(/dynamically imported/);
    expect(reload).not.toHaveBeenCalled();
  });

  it("rethrows errors that are not about chunks", async () => {
    const reload = vi.fn();
    await expect(loadChunk(() => Promise.reject(new Error("render")), reload)).rejects.toThrow("render");
    expect(reload).not.toHaveBeenCalled();
  });
});
