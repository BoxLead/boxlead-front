import { describe, expect, it } from "vitest";
import { safeExternalUrl } from "./links";

describe("safeExternalUrl", () => {
  it("keeps web links", () => {
    expect(safeExternalUrl("https://www.instagram.com/reel/abc/")).toBe("https://www.instagram.com/reel/abc/");
    expect(safeExternalUrl("http://articulo.mercadolibre.com.ar/MLA-1")).toBe("http://articulo.mercadolibre.com.ar/MLA-1");
  });

  it("drops anything that is not a web link", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,<p>hi</p>")).toBeNull();
    expect(safeExternalUrl("/app/inbox")).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
    expect(safeExternalUrl("")).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
  });
});
