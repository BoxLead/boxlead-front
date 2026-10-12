import { describe, expect, it } from "vitest";
import { draftFrom, toSettings, validate } from "./settingsForm";

const settings = {
  manualReplyMinutes: 4,
  businessHours: { weekdays: [0, 1, 2], from: 9, to: 18 },
};

describe("settings form", () => {
  it("round-trips the saved settings", () => {
    expect(toSettings(draftFrom(settings))).toEqual(settings);
  });

  it("allows an account without business hours", () => {
    const draft = { ...draftFrom(settings), weekdays: [] };
    expect(validate(draft)).toEqual({ minutes: false, hours: false });
    expect(toSettings(draft).businessHours).toBeNull();
  });

  it("rejects bad minutes and closing hours", () => {
    expect(validate({ ...draftFrom(settings), minutes: "61", from: 18, to: 9 })).toEqual({ minutes: true, hours: true });
    expect(validate({ ...draftFrom(settings), minutes: "2.5" }).minutes).toBe(true);
  });
});
