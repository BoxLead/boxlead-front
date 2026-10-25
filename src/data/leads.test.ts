import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import type { LeadResponse } from "../api/types";
import { clearQueryCache, getQueryState, setQueryData } from "./queryCache";
import { ALL_LEADS_KEY, assignLeadTemperature, deleteLead, leadKey } from "./leads";

vi.mock("../api/client", () => ({
  api: { delete: vi.fn(), put: vi.fn() },
}));

const lead: LeadResponse = {
  id: "lead-1",
  platform: "WHATSAPP",
  externalLeadId: null,
  name: "Martín",
  email: null,
  phone: null,
  status: "NEW",
  postSaleOnly: false,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

describe("deleteLead", () => {
  afterEach(() => {
    clearQueryCache();
    vi.clearAllMocks();
  });

  it("drops the lead from the list after the server accepts it", async () => {
    setQueryData<LeadResponse[]>(ALL_LEADS_KEY, () => [lead, { ...lead, id: "lead-2", name: "Ana" }]);
    vi.mocked(api.delete).mockResolvedValue(undefined);

    await deleteLead(lead.id);

    expect(api.delete).toHaveBeenCalledWith(leadKey(lead.id));
    expect(getQueryState<LeadResponse[]>(ALL_LEADS_KEY).data?.map((item) => item.id)).toEqual(["lead-2"]);
  });

  it("leaves the list alone when the server rejects the delete", async () => {
    setQueryData<LeadResponse[]>(ALL_LEADS_KEY, () => [lead]);
    vi.mocked(api.delete).mockRejectedValue(new Error("no"));

    await expect(deleteLead(lead.id)).rejects.toThrow("no");
    expect(getQueryState<LeadResponse[]>(ALL_LEADS_KEY).data).toEqual([lead]);
  });
});

describe("assignLeadTemperature", () => {
  afterEach(() => {
    clearQueryCache();
    vi.clearAllMocks();
  });

  it("shows the temperature right away and keeps what the server answers", async () => {
    setQueryData<LeadResponse[]>(ALL_LEADS_KEY, () => [lead]);
    let resolve: (value: LeadResponse) => void = () => undefined;
    vi.mocked(api.put).mockReturnValue(new Promise((done) => (resolve = done)));

    const pending = assignLeadTemperature(lead, "HOT");

    expect(getQueryState<LeadResponse[]>(ALL_LEADS_KEY).data?.[0].temperature).toBe("HOT");
    resolve({ ...lead, temperature: "HOT" });
    await pending;
    expect(api.put).toHaveBeenCalledWith(`${leadKey(lead.id)}/temperature`, { temperature: "HOT" });
    expect(getQueryState<LeadResponse>(leadKey(lead.id)).data?.temperature).toBe("HOT");
  });

  it("sends null to clear the temperature", async () => {
    const warm = { ...lead, temperature: "WARM" as const };
    setQueryData<LeadResponse[]>(ALL_LEADS_KEY, () => [warm]);
    vi.mocked(api.put).mockResolvedValue({ ...lead, temperature: null });

    await assignLeadTemperature(warm, null);

    expect(api.put).toHaveBeenCalledWith(`${leadKey(lead.id)}/temperature`, { temperature: null });
    expect(getQueryState<LeadResponse[]>(ALL_LEADS_KEY).data?.[0].temperature).toBeNull();
  });

  it("restores the previous temperature when the server rejects it", async () => {
    const warm = { ...lead, temperature: "WARM" as const };
    setQueryData<LeadResponse[]>(ALL_LEADS_KEY, () => [warm]);
    vi.mocked(api.put).mockRejectedValue(new Error("no"));

    await expect(assignLeadTemperature(warm, "COLD")).rejects.toThrow("no");
    expect(getQueryState<LeadResponse[]>(ALL_LEADS_KEY).data?.[0].temperature).toBe("WARM");
  });
});
