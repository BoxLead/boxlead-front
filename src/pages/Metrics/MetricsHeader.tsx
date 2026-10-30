import { useTranslation } from "react-i18next";
import type { CategoryResponse, PlatformType } from "../../api/types";
import { PrintIcon, SlidersIcon } from "../../components/icons/UiIcons";
import { ChoiceGroup } from "../../components/ui/ChoiceGroup";
import { getPlatform } from "../../platforms";
import { formatShortDate } from "../../util/format";
import { PERIODS, type MetricsPeriod } from "../../util/metrics";
import { UNCATEGORIZED } from "../../util/categories";
import type { MetricsFilters } from "./metricsModel";
import type { MetricsRange } from "./metricsView";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import "./MetricsHeader.css";

type MetricsHeaderProps = {
  period: MetricsPeriod;
  periods?: readonly MetricsPeriod[];
  note?: string | null;
  controls?: boolean;
  filters: MetricsFilters;
  platforms: PlatformType[];
  categories: CategoryResponse[];
  range: MetricsRange | null;
  onPeriodChange: (period: MetricsPeriod) => void;
  onFiltersChange: (patch: Partial<MetricsFilters>) => void;
  onEditSettings: () => void;
};

export function MetricsHeader({
  period,
  periods = PERIODS,
  note = null,
  controls = true,
  filters,
  platforms,
  categories,
  range,
  onPeriodChange,
  onFiltersChange,
  onEditSettings,
}: MetricsHeaderProps) {
  const { t } = useTranslation("metrics");
  const filtered = filters.platform !== "ALL" || filters.category !== null;
  const compact = useMediaQuery("(max-width: 520px)");
  const { platform, category } = filters;
  const channelOptions = platform === "ALL" || platforms.includes(platform) ? platforms : [...platforms, platform];
  const missingCategory =
    category && category !== UNCATEGORIZED && !categories.some((item) => item.id === category) ? category : null;
  return (
    <header className="m-header">
      <div className="m-header-title">
        <div className="m-header-name">
          <h1 className="page-title">{t("title")}</h1>
        </div>
        {range ? (
          <p className="m-header-range">
            {t("range", { from: formatShortDate(range.from), to: formatShortDate(range.to) })}
            <span aria-hidden="true"> · </span>
            <span>
              {t("header.against", { from: formatShortDate(range.previousFrom), to: formatShortDate(range.previousTo) })}
            </span>
          </p>
        ) : null}
        {note ? <p className="m-header-note">{note}</p> : null}
      </div>

      <div className="m-header-actions">
        <button
          type="button"
          className="btn btn-icon"
          aria-label={t("header.settings")}
          title={t("header.settings")}
          disabled={!range}
          onClick={onEditSettings}
        >
          <SlidersIcon width={18} height={18} />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label={t("header.exportPdf")}
          title={t("header.exportPdf")}
          disabled={!range}
          onClick={() => window.print()}
        >
          <PrintIcon width={18} height={18} />
        </button>
      </div>

      {controls ? (
        <div className="m-header-controls">
          <ChoiceGroup
            label={t("header.period")}
            variant="segmented"
            value={String(period)}
            onChange={(value) => onPeriodChange(Number(value) as MetricsPeriod)}
            choices={periods.map((days) => ({ value: String(days), label: t("header.periodDays", { days }) }))}
          />
          <label className="m-filter">
            <span className="visually-hidden">{t("header.channel")}</span>
            <select
              className="select"
              value={filters.platform}
              onChange={(event) => onFiltersChange({ platform: event.target.value as PlatformType | "ALL" })}
            >
              <option value="ALL">{compact ? t("header.allChannelsShort") : t("header.allChannels")}</option>
              {channelOptions.map((id) => (
                <option key={id} value={id}>
                  {getPlatform(id).name}
                </option>
              ))}
            </select>
          </label>
          <label className="m-filter">
            <span className="visually-hidden">{t("header.category")}</span>
            <select
              className="select"
              value={filters.category ?? ""}
              onChange={(event) => onFiltersChange({ category: event.target.value || null })}
            >
              <option value="">{compact ? t("header.allCategoriesShort") : t("header.allCategories")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
              <option value={UNCATEGORIZED}>{t("categories.uncategorized")}</option>
              {missingCategory ? <option value={missingCategory}>{t("categories.deleted")}</option> : null}
            </select>
          </label>
          {filtered ? (
            <button
              type="button"
              className="m-header-clear"
              onClick={() => onFiltersChange({ platform: "ALL", category: null })}
            >
              {t("header.clear")}
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
