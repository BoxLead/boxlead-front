import { describe, expect, it } from "vitest";
import { readFragmentToken } from "./fragmentToken";

describe("readFragmentToken", () => {
  it("reads the token with or without the hash sign", () => {
    expect(readFragmentToken("#abc")).toBe("abc");
    expect(readFragmentToken("abc")).toBe("abc");
  });

  it("gives nothing for an empty fragment", () => {
    expect(readFragmentToken("")).toBeNull();
    expect(readFragmentToken("#  ")).toBeNull();
  });
});
