import type { MetricsDay, MetricsSegment, PlatformType } from "../../api/types";
import { emptyAgent, emptyFirstResponse, emptyStatuses, emptyWeek, RESPONSE_LIMITS } from "../../util/metrics";

export function testDay(date: string, leads: number, patch: Partial<MetricsDay> = {}): MetricsDay {
  return {
    date,
    leads,
    qualified: 0,
    agentReplies: leads * 2,
    responseBuckets: RESPONSE_LIMITS.map((_, index) => (index === 0 ? leads : 0)),
    unanswered: 0,
    ...patch,
  };
}

export function testSegment(
  platform: PlatformType,
  categoryId: string | null,
  days: MetricsDay[],
  patch: Partial<MetricsSegment> = {},
): MetricsSegment {
  return {
    platform,
    categoryId,
    days,
    leadStatuses: emptyStatuses(),
    firstResponse: emptyFirstResponse(),
    inboundByHour: emptyWeek(),
    outsideHours: null,
    agent: emptyAgent(),
    ...patch,
  };
}
