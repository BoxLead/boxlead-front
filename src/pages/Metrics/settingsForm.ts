import type { MetricsSettings } from "../../api/types";

export type SettingsDraft = {
  minutes: string;
  weekdays: number[];
  from: number;
  to: number;
};

export type SettingsErrors = {
  minutes: boolean;
  hours: boolean;
};

export function draftFrom(settings: MetricsSettings): SettingsDraft {
  return {
    minutes: String(settings.manualReplyMinutes),
    weekdays: settings.businessHours?.weekdays ?? [],
    from: settings.businessHours?.from ?? 9,
    to: settings.businessHours?.to ?? 18,
  };
}

export function validate(draft: SettingsDraft): SettingsErrors {
  const minutes = Number(draft.minutes);
  return {
    minutes: !Number.isInteger(minutes) || minutes < 1 || minutes > 60,
    hours: draft.weekdays.length > 0 && draft.to <= draft.from,
  };
}

export function toSettings(draft: SettingsDraft): MetricsSettings {
  return {
    manualReplyMinutes: Number(draft.minutes),
    businessHours:
      draft.weekdays.length > 0
        ? { weekdays: [...draft.weekdays].sort((a, b) => a - b), from: draft.from, to: draft.to }
        : null,
  };
}
