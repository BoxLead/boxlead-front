import { afterEach, describe, expect, it } from "vitest";
import { toApiError } from "../api/client";
import { dismissPlanError, lastPlanError } from "./planErrors";

const LIMIT = { error: "Payment Required", message: "Limit", code: "PLAN_LIMIT_REACHED" };

describe("plan error notices", () => {
  afterEach(() => {
    dismissPlanError();
  });

  it("leaves a metrics 402 to the metrics page", () => {
    toApiError(402, LIMIT, "/metrics?from=2026-01-01&to=2026-01-30&timezone=UTC");
    expect(lastPlanError()).toBeNull();
  });

  it("keeps the shared notice for the rest", () => {
    toApiError(402, LIMIT, "/metrics-other");
    expect(lastPlanError()).toBe("PLAN_LIMIT_REACHED");
    dismissPlanError();
    toApiError(402, LIMIT, null);
    expect(lastPlanError()).toBe("PLAN_LIMIT_REACHED");
  });
});
