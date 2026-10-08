import type { CategoryResponse, PlatformType } from "../../api/types";
import { PrintIcon, SlidersIcon } from "../../components/icons/UiIcons";
import { ChoiceGroup } from "../../components/ui/ChoiceGroup";
import { getPlatform } from "../../platforms";
import { formatShortDate } from "../../util/format";
import { PERIODS, type MetricsPeriod } from "../../util/metrics";
import { UNCATEGORIZED, type MetricsFilters } from "./metricsModel";
import { useMediaQuery } from "./useMediaQuery";
import "./MetricsHeader.css";

type MetricsHeaderProps = {
  demo: boolean;
  period: MetricsPeriod;
  filters: MetricsFilters;
  platforms: PlatformType[];
  categories: CategoryResponse[];
  range: { from: string; to: string; previousFrom: string; previousTo: string } | null;
  ready: boolean;
  onPeriodChange: (period: MetricsPeriod) => void;
  onFiltersChange: (patch: Partial<MetricsFilters>) => void;
  onEditSettings: () => void;
};

export function MetricsHeader({
  demo,
  period,
  filters,
  platforms,
  categories,
  range,
  ready,
  onPeriodChange,
  onFiltersChange,
  onEditSettings,
}: MetricsHeaderProps) {
  const filtered = filters.platform !== "ALL" || filters.category !== null;
  const compact = useMediaQuery("(max-width: 520px)");
  return (
    <header className="m-header">
      <div className="m-header-title">
        <div className="m-header-name">
          <h1 className="page-title">Métricas</h1>
          {demo ? <span className="m-header-demo">Datos de ejemplo</span> : null}
        </div>
        {range ? (
          <p className="m-header-range">
            {formatShortDate(range.from)} al {formatShortDate(range.to)}
            <span aria-hidden="true"> · </span>
            <span>
              contra {formatShortDate(range.previousFrom)} al {formatShortDate(range.previousTo)}
            </span>
          </p>
        ) : null}
      </div>

      <div className="m-header-actions">
        <button
          type="button"
          className="m-icon-button"
          aria-label="Supuestos"
          title="Supuestos"
          disabled={!ready}
          onClick={onEditSettings}
        >
          <SlidersIcon width={18} height={18} />
        </button>
        <button
          type="button"
          className="m-icon-button"
          aria-label="Exportar PDF"
          title="Exportar PDF"
          disabled={!ready}
          onClick={() => window.print()}
        >
          <PrintIcon width={18} height={18} />
        </button>
      </div>

      <div className="m-header-controls">
        <ChoiceGroup
          label="Período"
          variant="segmented"
          value={String(period)}
          onChange={(value) => onPeriodChange(Number(value) as MetricsPeriod)}
          choices={PERIODS.map((days) => ({ value: String(days), label: `${days} días` }))}
        />
        <label className="m-select">
          <span className="visually-hidden">Canal</span>
          <select
            value={filters.platform}
            onChange={(event) => onFiltersChange({ platform: event.target.value as PlatformType | "ALL" })}
          >
            <option value="ALL">{compact ? "Canales" : "Todos los canales"}</option>
            {platforms.map((id) => (
              <option key={id} value={id}>
                {getPlatform(id).name}
              </option>
            ))}
          </select>
        </label>
        <label className="m-select">
          <span className="visually-hidden">Categoría</span>
          <select
            value={filters.category ?? ""}
            onChange={(event) => onFiltersChange({ category: event.target.value || null })}
          >
            <option value="">{compact ? "Categorías" : "Todas las categorías"}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            <option value={UNCATEGORIZED}>Sin categoría</option>
          </select>
        </label>
        {filtered ? (
          <button
            type="button"
            className="m-clear"
            onClick={() => onFiltersChange({ platform: "ALL", category: null })}
          >
            Limpiar
          </button>
        ) : null}
      </div>
    </header>
  );
}
