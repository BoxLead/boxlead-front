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
  emptyAgent,
  emptyFirstResponse,
  emptyStatuses,
  emptyWeek,
  FAST_RESPONSE_BUCKETS,
  HANDOFF_REASONS,
  isWithinBusinessHours,
  RESPONSE_LIMITS,
} from "../util/metrics";
import { gammaNoise, pick, poisson, seeded, type Random } from "./demoRandom";
import { effectsFor, type DayEffects } from "./metricsDemoScenario";

type ChannelProfile = {
  platform: PlatformType;
  leadsPerDay: number;
  qualifyRate: number;
  closeRate: number;
  weekdays: number[];
  hours: number[];
  agentShare: number;
};

type Lead = {
  hour: number;
  outside: boolean;
  inbound: number;
  conversations: number;
  bucket: number | null;
  byAgent: boolean;
  handoff: HandoffReason | null;
  agentReplies: number;
  humanReplies: number;
  qualifiedOn: string | null;
  status: LeadStatus;
};

type DemoInput = {
  from: string;
  to: string;
  today: string;
  timezone: string;
  categories: CategoryResponse[];
  settings: MetricsSettings;
};

export const DEMO_SETTINGS: MetricsSettings = {
  manualReplyMinutes: 4,
  businessHours: { weekdays: [0, 1, 2, 3, 4, 5], from: 9, to: 19 },
};

const PROFILES: ChannelProfile[] = [
  {
    platform: "INSTAGRAM",
    leadsPerDay: 9,
    qualifyRate: 0.26,
    closeRate: 0.34,
    weekdays: [0.85, 1.25, 1.0, 1.05, 0.9, 1.15, 1.1],
    hours: [3, 2, 1, 1, 1, 1, 1, 2, 3, 4, 5, 6, 6, 6, 5, 5, 6, 7, 8, 11, 13, 13, 10, 6],
    agentShare: 0.76,
  },
  {
    platform: "WHATSAPP",
    leadsPerDay: 6,
    qualifyRate: 0.44,
    closeRate: 0.42,
    weekdays: [1.2, 1.15, 1.05, 1.05, 1.0, 0.6, 0.35],
    hours: [1, 1, 0, 0, 0, 1, 1, 3, 6, 9, 11, 12, 10, 8, 7, 8, 9, 10, 9, 7, 5, 4, 3, 2],
    agentShare: 0.68,
  },
  {
    platform: "META",
    leadsPerDay: 2.5,
    qualifyRate: 0.2,
    closeRate: 0.28,
    weekdays: [1, 1, 1, 1, 1, 0.9, 0.8],
    hours: [2, 1, 1, 1, 1, 1, 2, 3, 4, 5, 6, 6, 6, 6, 6, 6, 6, 7, 7, 8, 8, 7, 5, 3],
    agentShare: 0.8,
  },
  {
    platform: "MELI",
    leadsPerDay: 5,
    qualifyRate: 0.36,
    closeRate: 0.48,
    weekdays: [0.9, 0.95, 0.95, 1.0, 1.05, 1.2, 1.25],
    hours: [5, 3, 2, 1, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 6, 6, 7, 8, 10, 12, 12, 9],
    agentShare: 0.8,
  },
];

const CATEGORY_WEIGHTS = [0.38, 0.27, 0.16, 0.09];
const CATEGORY_QUALIFY = [1.0, 1.5, 0.85, 0.35];
const GROWING_CATEGORY = 3;
const UNCATEGORIZED_WEIGHT = 0.12;
const AGENT_SPEED = [0.93, 0.06, 0.01, 0, 0, 0, 0];
const TEAM_SPEED = [0.06, 0.2, 0.22, 0.22, 0.16, 0.11, 0.03];
const TEAM_SPEED_CLOSED = [0.02, 0.04, 0.07, 0.12, 0.25, 0.4, 0.1];
const TEAM_SPEED_SHORT_STAFFED = [0.01, 0.05, 0.1, 0.2, 0.28, 0.28, 0.08];
const SPEED_EFFECT = [1.2, 1.1, 0.85, 0.7, 0.58, 0.5, 0.45];
const HANDOFF_WEIGHTS = [0.45, 0.35, 0.2];
const HANDOFF_RATE = 0.13;
const LOST_RATE = 0.38;
const NOISE_SHAPE = 14;
const LOOKBACK_DAYS = 12;

type LeadContext = {
  profile: ChannelProfile;
  effects: DayEffects;
  date: string;
  daysAgo: number;
  weekday: number;
  today: string;
  categoryEffect: number;
  settings: MetricsSettings;
};

function firstResponse(roll: Random, context: LeadContext, outside: boolean) {
  const { profile, effects, daysAgo } = context;
  const unanswered = roll() < (daysAgo === 0 ? 0.08 : daysAgo <= 2 ? 0.03 : 0);
  if (unanswered) return { bucket: null, byAgent: false };
  if (roll() < (outside ? 0.97 : profile.agentShare * effects.agentShare)) {
    return { bucket: pick(AGENT_SPEED, roll()), byAgent: true };
  }
  const speed = outside ? TEAM_SPEED_CLOSED : effects.slowTeam ? TEAM_SPEED_SHORT_STAFFED : TEAM_SPEED;
  return { bucket: pick(speed, roll()), byAgent: false };
}

function simulateLead(roll: Random, context: LeadContext): Lead {
  const { profile, effects, date, weekday, today, categoryEffect, settings } = context;
  const hour = pick(profile.hours, roll());
  const hours = settings.businessHours;
  const outside = hours ? !isWithinBusinessHours(hours, weekday, hour) : false;
  const inbound = 2 + Math.floor(roll() * 5);
  const conversations = roll() < 0.14 ? 2 : 1;
  const { bucket, byAgent } = firstResponse(roll, context, outside);

  const handoff = byAgent && roll() < HANDOFF_RATE ? HANDOFF_REASONS[pick(HANDOFF_WEIGHTS, roll())] : null;
  const agentReplies = byAgent ? (handoff ? 1 + Math.floor(roll() * 2) : inbound + Math.floor(roll() * 2)) : 0;
  const humanReplies =
    bucket === null ? 0 : byAgent ? (handoff ? 1 + Math.floor(roll() * 3) : 0) : Math.max(1, inbound - Math.floor(roll() * 2));

  const speed = bucket === null ? 0.2 : SPEED_EFFECT[bucket];
  const qualifies = roll() < Math.min(0.95, profile.qualifyRate * categoryEffect * speed * effects.qualify);
  const qualifiedOn = addDays(date, Math.floor(roll() * roll() * 3));
  const closes = qualifies && roll() < Math.min(0.95, profile.closeRate * effects.close);
  const closedOn = addDays(qualifiedOn, Math.floor(roll() * roll() * 5));
  const loses = !qualifies && roll() < LOST_RATE;
  const lostOn = addDays(date, 1 + Math.floor(roll() * 7));

  let status: LeadStatus = bucket === null ? "NEW" : "CONTACTED";
  if (closes && closedOn <= today) status = "CLOSED";
  else if (qualifies && qualifiedOn <= today) status = "QUALIFIED";
  else if (loses && lostOn <= today) status = "LOST";

  return {
    hour,
    outside,
    inbound,
    conversations,
    bucket,
    byAgent,
    handoff,
    agentReplies,
    humanReplies,
    qualifiedOn: qualifies ? qualifiedOn : null,
    status,
  };
}

function emptySegment(platform: PlatformType, categoryId: string | null, withHours: boolean): MetricsSegment {
  return {
    platform,
    categoryId,
    days: [],
    leadStatuses: emptyStatuses(),
    firstResponse: emptyFirstResponse(),
    inboundByHour: emptyWeek(),
    outsideHours: withHours ? { conversations: 0, answeredUnder5m: 0 } : null,
    agent: emptyAgent(),
  };
}

function emptyDay(date: string): MetricsDay {
  return {
    date,
    leads: 0,
    conversations: 0,
    inboundMessages: 0,
    agentReplies: 0,
    humanReplies: 0,
    qualified: 0,
    responseBuckets: RESPONSE_LIMITS.map(() => 0),
    unanswered: 0,
  };
}

function recordLead(segment: MetricsSegment, day: MetricsDay, lead: Lead, weekday: number) {
  day.leads++;
  day.conversations += lead.conversations;
  day.inboundMessages += lead.inbound;
  day.agentReplies += lead.agentReplies;
  day.humanReplies += lead.humanReplies;
  segment.inboundByHour[weekday * 24 + lead.hour] += Math.ceil(lead.inbound * 0.7);
  segment.inboundByHour[weekday * 24 + ((lead.hour + 1) % 24)] += Math.floor(lead.inbound * 0.3);
  segment.leadStatuses[lead.status]++;

  const fast = lead.bucket !== null && lead.bucket < FAST_RESPONSE_BUCKETS;
  if (lead.bucket === null) {
    day.unanswered++;
    segment.firstResponse.unanswered++;
  } else {
    day.responseBuckets[lead.bucket]++;
    (lead.byAgent ? segment.firstResponse.agent : segment.firstResponse.human)[lead.bucket]++;
    if (lead.status === "QUALIFIED" || lead.status === "CLOSED") segment.firstResponse.converted[lead.bucket]++;
  }
  if (segment.agent && lead.byAgent) {
    if (lead.handoff) segment.agent.handoffs[lead.handoff]++;
    else segment.agent.resolved++;
  }
  if (segment.outsideHours && lead.outside) {
    segment.outsideHours.conversations++;
    if (fast) segment.outsideHours.answeredUnder5m++;
  }
}

export function buildDemoReport({ from, to, today, timezone, categories, settings }: DemoInput): MetricsReport {
  const ordered = [...categories].sort((a, b) => a.position - b.position);
  const segments = new Map<string, MetricsSegment>();
  const days = new Map<string, MetricsDay>();

  const segmentFor = (platform: PlatformType, categoryId: string | null) => {
    const key = `${platform}|${categoryId ?? ""}`;
    const segment = segments.get(key) ?? emptySegment(platform, categoryId, settings.businessHours !== null);
    segments.set(key, segment);
    return segment;
  };
  const dayOf = (segment: MetricsSegment, date: string) => {
    const key = `${segment.platform}|${segment.categoryId ?? ""}|${date}`;
    let day = days.get(key);
    if (!day) {
      day = emptyDay(date);
      days.set(key, day);
      segment.days.push(day);
    }
    return day;
  };

  for (const date of dateRange(addDays(from, -LOOKBACK_DAYS), to)) {
    const daysAgo = daysBetween(date, today);
    if (daysAgo < 0) continue;
    const weekday = weekdayIndex(date);
    const categoryWeights = [
      ...ordered.map((_, position) => {
        const weight = CATEGORY_WEIGHTS[position] ?? 0.04;
        return position === GROWING_CATEGORY ? weight * (0.8 + 0.45 * Math.max(0, 1 - daysAgo / 90)) : weight;
      }),
      UNCATEGORIZED_WEIGHT,
    ];

    for (const profile of PROFILES) {
      const next = seeded(`${date}|${profile.platform}`);
      const effects = effectsFor(profile.platform, daysAgo, Number(date.slice(8)));
      const mean = profile.leadsPerDay * profile.weekdays[weekday] * effects.volume * gammaNoise(NOISE_SHAPE, next);
      const count = poisson(daysAgo === 0 ? mean * 0.55 : mean, next);

      for (let index = 0; index < count; index++) {
        const roll = seeded(`${date}|${profile.platform}|${index}`);
        const categoryIndex = pick(categoryWeights, roll());
        const category = ordered[categoryIndex] ?? null;
        const segment = segmentFor(profile.platform, category?.id ?? null);
        const lead = simulateLead(roll, {
          profile,
          effects,
          date,
          daysAgo,
          weekday,
          today,
          categoryEffect: category ? (CATEGORY_QUALIFY[categoryIndex] ?? 0.9) : 0.6,
          settings,
        });
        if (lead.qualifiedOn && lead.qualifiedOn >= from && lead.qualifiedOn <= to && lead.qualifiedOn <= today) {
          dayOf(segment, lead.qualifiedOn).qualified++;
        }
        if (date >= from) recordLead(segment, dayOf(segment, date), lead, weekday);
      }
    }
  }

  return {
    from,
    to,
    timezone,
    generatedAt: new Date().toISOString(),
    segments: [...segments.values()]
      .filter((segment) => segment.days.length > 0)
      .map((segment) => ({ ...segment, days: [...segment.days].sort((a, b) => a.date.localeCompare(b.date)) })),
  };
}
