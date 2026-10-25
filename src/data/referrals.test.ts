import { describe, expect, it } from "vitest";
import { activeCodes } from "./referrals";

describe("referrals", () => {
  it("keeps only the active codes", () => {
    const codes = activeCodes([
      { code: "AAAAAAAAAA", link: "https://api.boxlead.app/r/AAAAAAAAAA", status: "DISABLED" },
      { code: "BBBBBBBBBB", link: "https://api.boxlead.app/r/BBBBBBBBBB", status: "ACTIVE" },
    ]);
    expect(codes.map((code) => code.code)).toEqual(["BBBBBBBBBB"]);
  });
});
