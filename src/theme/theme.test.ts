import { afterEach, describe, expect, it } from "vitest";
import { applyTheme, resolveSidebar, resolveTheme, setSidebar, setTheme, SIDEBAR_KEY, THEME_KEY } from "./theme";

describe("resolveTheme", () => {
  it("uses a stored choice", () => {
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("dark", true)).toBe("dark");
  });

  it("follows the system when nothing valid is stored", () => {
    expect(resolveTheme(null, true)).toBe("light");
    expect(resolveTheme(null, false)).toBe("dark");
    expect(resolveTheme("blue", true)).toBe("light");
    expect(resolveTheme("", false)).toBe("dark");
  });
});

describe("resolveSidebar", () => {
  it("collapses only for the stored collapsed value", () => {
    expect(resolveSidebar("collapsed")).toBe("collapsed");
    expect(resolveSidebar("expanded")).toBe("expanded");
    expect(resolveSidebar(null)).toBe("expanded");
    expect(resolveSidebar("nope")).toBe("expanded");
  });
});

describe("preferences", () => {
  afterEach(() => {
    document.querySelector('meta[name="theme-color"]')?.remove();
  });

  it("stores a chosen theme and can apply one without storing it", () => {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#0a1521";
    document.head.append(meta);

    setTheme("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
    expect(meta.content).toBe("#f4f3ec");

    applyTheme("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(meta.content).toBe("#0a1521");
  });

  it("stores the sidebar mode", () => {
    setSidebar("collapsed");
    expect(document.documentElement.dataset.sidebar).toBe("collapsed");
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe("collapsed");
  });
});
