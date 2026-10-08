import type { CategoryResponse, PlatformType } from "../../api/types";
import { PrintIcon, SlidersIcon } from "../../components/icons/UiIcons";
import { ChoiceGroup, type Choice } from "../../components/ui/ChoiceGroup";
import { getPlatform } from "../../platforms";
import { PERIODS, type MetricsPeriod } from "../../util/metrics";
import { UNCATEGORIZED, type MetricsFilters } from "./metricsModel";
import "./MetricsToolbar.css";

type MetricsToolbarProps = {
  period: MetricsPeriod;
  filters: MetricsFilters;
  platforms: PlatformType[];
  categories: CategoryResponse[];
  onPeriodChange: (period: MetricsPeriod) => void;
  onFiltersChange: (patch: Partial<MetricsFilters>) => void;
  onEditSettings: () => void;
};

export function MetricsToolbar({
  period,
  filters,
  platforms,
  categories,
  onPeriodChange,
  onFiltersChange,
  onEditSettings,
}: MetricsToolbarProps) {
  const periodChoices: Choice<string>[] = PERIODS.map((days) => ({ value: String(days), label: `${days} días` }));
  const channelChoices: Choice<PlatformType | "ALL">[] = [
    { value: "ALL", label: "Todos" },
    ...platforms.map((id) => ({ value: id, label: getPlatform(id).name, icon: getPlatform(id).logo(16) })),
  ];

  return (
    <div className="metrics-toolbar">
      <div className="metrics-toolbar-filters">
        <ChoiceGroup
          label="Período"
          variant="segmented"
          choices={periodChoices}
          value={String(period)}
          onChange={(value) => onPeriodChange(Number(value) as MetricsPeriod)}
        />
        {platforms.length > 1 ? (
          <ChoiceGroup
            label="Canal"
            className="metrics-channels"
            choices={channelChoices}
            value={filters.platform}
            onChange={(platform) => onFiltersChange({ platform })}
          />
        ) : null}
        {categories.length > 0 ? (
          <label className="metrics-category">
            <span className="visually-hidden">Filtrar por categoría</span>
            <select
              value={filters.category ?? ""}
              onChange={(event) => onFiltersChange({ category: event.target.value || null })}
            >
              <option value="">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
              <option value={UNCATEGORIZED}>Sin categoría</option>
            </select>
          </label>
        ) : null}
      </div>
      <div className="metrics-toolbar-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onEditSettings}>
          <SlidersIcon width={16} height={16} />
          Supuestos
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
          <PrintIcon width={16} height={16} />
          Exportar PDF
        </button>
      </div>
    </div>
  );
}
