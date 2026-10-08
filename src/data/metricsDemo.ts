import type {
  CategoryResponse,
  HandoffReason,
  LeadStatus,
  MetricsDay,
  MetricsReport,
  MetricsSegment,
  MetricsSettings,
  PlatformType,
} from "../api/types";
import { addDays, dateRange, daysBetween, weekdayIndex } from "../util/dates";
import {
  FAST_RESPONSE_BUCKETS,
  HANDOFF_REASONS,
  HOURS_PER_WEEK,
  isWithinBusinessHours,
  RESPONSE_BUCKETS,
} from "../util/metrics";

type ChannelProfile = {
  platform: PlatformType;
  leadsPerDay: number;
  qualifyRate: number;
  closeRate: number;
  weekdays: number[];
  hours: number[];
  agentShare: number;
  campaign: boolean;
};

export const DEMO_SETTINGS: MetricsSettings = {
  averageTicket: 60_000,
  currency: "ARS",
  manualReplyMinutes: 4,
  businessHours: { weekdays: [0, 1, 2, 3, 4, 5], from: 9, to: 19 },
};

const PROFILES: ChannelProfile[] = [
  {
    platform: "INSTAGRAM",
    leadsPerDay: 9,
    qualifyRate: 0.26,
    closeRate: 0.34,
    weekdays: [0.9, 1.2, 1.0, 1.0, 0.95, 1.1, 1.05],
    hours: [3, 2, 1, 1, 1, 1, 1, 2, 3, 4, 5, 6, 6, 6, 5, 5, 6, 7, 8, 11, 13, 13, 10, 6],
    agentShare: 0.76,
    campaign: true,
  },
  {
    platform: "WHATSAPP",
    leadsPerDay: 6,
    qualifyRate: 0.44,
    closeRate: 0.42,
    weekdays: [1.15, 1.1, 1.05, 1.05, 1.0, 0.7, 0.5],
    hours: [1, 1, 0, 0, 0, 1, 1, 3, 6, 9, 11, 12, 10, 8, 7, 8, 9, 10, 9, 7, 5, 4, 3, 2],
    agentShare: 0.68,
    campaign: false,
  },
  {
    platform: "META",
    leadsPerDay: 2.5,
    qualifyRate: 0.2,
    closeRate: 0.28,
    weekdays: [1, 1, 1, 1, 1, 0.9, 0.8],
    hours: [2, 1, 1, 1, 1, 1, 2, 3, 4, 5, 6, 6, 6, 6, 6, 6, 6, 7, 7, 8, 8, 7, 5, 3],
    agentShare: 0.8,
    campaign: false,
  },
  {
    platform: "MELI",
    leadsPerDay: 5,
    qualifyRate: 0.36,
    closeRate: 0.48,
    weekdays: [0.9, 0.95, 0.95, 1.0, 1.05, 1.2, 1.25],
    hours: [5, 3, 2, 1, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 6, 6, 7, 8, 10, 12, 12, 9],
    agentShare: 0.8,
    campaign: false,
  },
];

const CATEGORY_WEIGHTS = [0.38, 0.27, 0.16, 0.09];
const CATEGORY_QUALIFY = [1.0, 1.5, 0.85, 0.35];
const UNCATEGORIZED_WEIGHT = 0.12;
const AGENT_SPEED = [0.93, 0.06, 0.01, 0, 0, 0, 0];
const HUMAN_SPEED_OPEN = [0.12, 0.3, 0.25, 0.18, 0.1, 0.04, 0.01];
const HUMAN_SPEED_CLOSED = [0.02, 0.04, 0.07, 0.12, 0.25, 0.4, 0.1];
const SPEED_EFFECT = [1.2, 1.1, 0.9, 0.7, 0.5, 0.4, 0.35];
const HANDOFF_WEIGHTS = [0.45, 0.35, 0.2];
const LOOKBACK_DAYS = 12;
const LEAD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "LOST", "CLOSED"];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function random(seed: string): () => number {
  let state = hash(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(weights: number[], roll: number): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let threshold = roll * total;
  for (let i = 0; i < weights.length; i++) {
    threshold -= weights[i];
    if (threshold < 0) return i;
  }
  return weights.length - 1;
}

function poisson(mean: number, next: () => number): number {
  const limit = Math.exp(-mean);
  let count = 0;
  let product = next();
  while (product > limit) {
    count++;
    product *= next();
  }
  return count;
}

function campaignLift(daysAgo: number): number {
  if (daysAgo > 18 || daysAgo < 8) return 1;
  return 1 + 0.9 * Math.exp(-(18 - daysAgo) / 2.5);
}

function emptySegment(platform: PlatformType, categoryId: string | null, withHours: boolean): MetricsSegment {
  return {
    platform,
    categoryId,
    days: [],
    leadStatuses: { NEW: 0, CONTACTED: 0, QUALIFIED: 0, LOST: 0, CLOSED: 0 },
    firstResponse: {
      agent: RESPONSE_BUCKETS.map(() => 0),
      human: RESPONSE_BUCKETS.map(() => 0),
      converted: RESPONSE_BUCKETS.map(() => 0),
      unanswered: 0,
    },
    inboundByHour: Array.from({ length: HOURS_PER_WEEK }, () => 0),
    outsideHours: withHours ? { conversations: 0, answeredUnder5m: 0 } : null,
    agent: { resolved: 0, handoffs: { ASKED_FOR_HUMAN: 0, AGENT_UNSURE: 0, TAKEN_OVER: 0 } },
  };
}

type DemoInput = {
  from: string;
  to: string;
  today: string;
  timezone: string;
  categories: CategoryResponse[];
  settings: MetricsSettings;
};

export function buildDemoReport({ from, to, today, timezone, categories, settings }: DemoInput): MetricsReport {
  const ordered = [...categories].sort((a, b) => a.position - b.position);
  const hours = settings.businessHours;
  const segments = new Map<string, MetricsSegment>();
  const segmentFor = (platform: PlatformType, categoryId: string | null) => {
    const key = `${platform}|${categoryId ?? ""}`;
    let segment = segments.get(key);
    if (!segment) {
      segment = emptySegment(platform, categoryId, hours !== null);
      segments.set(key, segment);
    }
    return segment;
  };

  const rows = new Map<string, MetricsDay>();
  const dayRow = (segment: MetricsSegment, date: string) => {
    const key = `${segment.platform}|${segment.categoryId ?? ""}|${date}`;
    let row = rows.get(key);
    if (!row) {
      row = { date, leads: 0, conversations: 0, inboundMessages: 0, agentReplies: 0, humanReplies: 0, qualified: 0, closed: 0 };
      rows.set(key, row);
      segment.days.push(row);
    }
    return row;
  };
  const inRange = (date: string) => date >= from && date <= to && date <= today;

  for (const date of dateRange(addDays(from, -LOOKBACK_DAYS), to)) {
    const daysAgo = daysBetween(date, today);
    if (daysAgo < 0) continue;
    const created = date >= from;
    const weekday = weekdayIndex(date);
    const growth = 1 - 0.0015 * daysAgo;
    const improvement = 0.8 + 0.32 * Math.max(0, 1 - daysAgo / 150);

    for (const profile of PROFILES) {
      const next = random(`${date}|${profile.platform}`);
      const lift = profile.campaign ? campaignLift(daysAgo) : 1;
      const mean = profile.leadsPerDay * profile.weekdays[weekday] * growth * lift * (0.85 + next() * 0.3);
      const leads = poisson(daysAgo === 0 ? mean * 0.55 : mean, next);

      for (let index = 0; index < leads; index++) {
        const roll = random(`${date}|${profile.platform}|${index}`);
        const categoryWeights = ordered.map((_, position) => {
          const base = CATEGORY_WEIGHTS[position] ?? 0.04;
          return position === 3 ? base * (0.8 + 0.45 * Math.max(0, 1 - daysAgo / 90)) : base;
        });
        const categoryIndex = pick([...categoryWeights, UNCATEGORIZED_WEIGHT], roll());
        const category = ordered[categoryIndex] ?? null;
        const segment = segmentFor(profile.platform, category?.id ?? null);
        const hour = pick(profile.hours, roll());
        const outside = hours ? !isWithinBusinessHours(hours, weekday, hour) : false;
        const inbound = 2 + Math.floor(roll() * 5);
        const conversations = roll() < 0.14 ? 2 : 1;

        const unansweredChance = daysAgo === 0 ? 0.08 : daysAgo <= 2 ? 0.03 : 0;
        let bucket: number | null = null;
        let agentReplies = 0;
        let humanReplies = 0;
        let handoff: HandoffReason | null = null;
        const unanswered = roll() < unansweredChance;
        if (!unanswered && roll() < (outside ? 0.97 : profile.agentShare)) {
          bucket = pick(AGENT_SPEED, roll());
          if (roll() < 0.13) {
            handoff = HANDOFF_REASONS[pick(HANDOFF_WEIGHTS, roll())];
            agentReplies = 1 + Math.floor(roll() * 2);
            humanReplies = 1 + Math.floor(roll() * 3);
          } else {
            agentReplies = inbound + Math.floor(roll() * 2);
          }
        } else if (!unanswered) {
          bucket = pick(outside ? HUMAN_SPEED_CLOSED : HUMAN_SPEED_OPEN, roll());
          humanReplies = Math.max(1, inbound - Math.floor(roll() * 2));
        }
        const byAgent = bucket !== null && agentReplies > 0;

        const speed = bucket === null ? 0.2 : SPEED_EFFECT[bucket];
        const categoryEffect = category ? (CATEGORY_QUALIFY[categoryIndex] ?? 0.9) : 0.6;
        const qualifies = roll() < Math.min(0.95, profile.qualifyRate * categoryEffect * speed * improvement);
        const qualifiedOn = addDays(date, Math.floor(roll() * roll() * 3));
        const closes = qualifies && roll() < profile.closeRate * improvement;
        const closedOn = addDays(qualifiedOn, Math.floor(roll() * roll() * 5));
        const loses = !qualifies && roll() < 0.38;
        const lostOn = addDays(date, 1 + Math.floor(roll() * 7));

        if (qualifies && inRange(qualifiedOn)) dayRow(segment, qualifiedOn).qualified++;
        if (closes && inRange(closedOn)) dayRow(segment, closedOn).closed++;
        if (!created) continue;

        const day = dayRow(segment, date);
        day.leads++;
        day.conversations += conversations;
        day.inboundMessages += inbound;
        day.agentReplies += agentReplies;
        day.humanReplies += humanReplies;
        segment.inboundByHour[weekday * 24 + hour] += Math.ceil(inbound * 0.7);
        segment.inboundByHour[weekday * 24 + ((hour + 1) % 24)] += Math.floor(inbound * 0.3);

        if (bucket === null) segment.firstResponse.unanswered++;
        else if (byAgent) segment.firstResponse.agent[bucket]++;
        else segment.firstResponse.human[bucket]++;
        if (segment.agent && byAgent) {
          if (handoff) segment.agent.handoffs[handoff]++;
          else segment.agent.resolved++;
        }
        if (segment.outsideHours && outside) {
          segment.outsideHours.conversations++;
          if (bucket !== null && bucket < FAST_RESPONSE_BUCKETS) segment.outsideHours.answeredUnder5m++;
        }

        let status: LeadStatus = bucket === null ? "NEW" : "CONTACTED";
        if (closes && closedOn <= today) status = "CLOSED";
        else if (qualifies && qualifiedOn <= today) status = "QUALIFIED";
        else if (loses && lostOn <= today) status = "LOST";
        segment.leadStatuses[status]++;
        if (bucket !== null && (status === "QUALIFIED" || status === "CLOSED")) {
          segment.firstResponse.converted[bucket]++;
        }
      }
    }
  }

  segments.forEach((segment) => segment.days.sort((a, b) => a.date.localeCompare(b.date)));

  return {
    from,
    to,
    timezone,
    generatedAt: new Date().toISOString(),
    segments: [...segments.values()].filter(
      (segment) => segment.days.length > 0 || LEAD_STATUSES.some((status) => segment.leadStatuses[status] > 0),
    ),
  };
}
