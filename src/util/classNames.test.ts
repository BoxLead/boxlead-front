import { describe, expect, it } from "vitest";
import { cx } from "./classNames";

describe("cx", () => {
  it("joins only the classes that apply", () => {
    expect(cx("card", false, null, undefined, "card-active", "")).toBe("card card-active");
    expect(cx()).toBe("");
  });
});
