import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { PlatformType } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ChartIcon, PrintIcon, SearchIcon, SlidersIcon } from "../../components/icons/UiIcons";
import { Banner } from "../../components/ui/Banner";
import { Tag } from "../../components/ui/Tag";
import { useToast } from "../../components/ui/toast";
import { METRICS_DEMO } from "../../data/metrics";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { CONNECTABLE_PLATFORMS } from "../../platforms";
import { formatShortDate } from "../../util/format";
import { PERIODS, type MetricsPeriod } from "../../util/metrics";
import { AgentPanel } from "./AgentPanel";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { ChannelTable } from "./ChannelTable";
import { Funnel } from "./Funnel";
import { Heatmap } from "./Heatmap";
import { InsightList } from "./InsightList";
import { KpiGrid } from "./KpiGrid";
import { LeadTrend } from "./LeadTrend";
import { MethodNotes } from "./MethodNotes";
import type { MetricsFilters } from "./metricsModel";
import { MetricsToolbar } from "./MetricsToolbar";
import { SettingsDialog } from "./SettingsDialog";
import { SpeedPanel } from "./SpeedPanel";
import { useMetricsView } from "./useMetricsView";
import "./Metrics.css";

const DEFAULT_PERIOD: MetricsPeriod = 30;

function parsePeriod(value: string | null): MetricsPeriod {
  return PERIODS.find((days) => String(days) === value) ?? DEFAULT_PERIOD;
}

function parseChannel(value: string | null): PlatformType | "ALL" {
  return CONNECTABLE_PLATFORMS.some((p) => p.id === value) ? (value as PlatformType) : "ALL";
}

export function Metrics() {
  useDocumentTitle("Métricas");
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const period = parsePeriod(searchParams.get("period"));
  const filters: MetricsFilters = {
    platform: parseChannel(searchParams.get("channel")),
    category: searchParams.get("category") || null,
  };
  const { view, loading, error, reload } = useMetricsView(period, filters);
  const filtered = filters.platform !== "ALL" || filters.category !== null;

  function setParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  }

  const openSettings = () => setSettingsOpen(true);

  return (
    <div className="page metrics">
      <header className="page-header metrics-header">
        <div className="metrics-heading">
          <div className="metrics-title-row">
            <h1 className="page-title">Métricas</h1>
            {METRICS_DEMO ? <Tag tone="warning">Datos de ejemplo</Tag> : null}
          </div>
          <p className="page-header-desc">
            Cómo rinden tus canales, tu equipo y el agente, y qué decisiones conviene tomar.
          </p>
        </div>
        <div className="metrics-header-side">
          {view ? (
            <p className="metrics-range">
              Del {formatShortDate(view.from)} al {formatShortDate(view.to)}
              <span>Comparado con {period === 7 ? "la semana anterior" : `los ${period} días anteriores`}</span>
            </p>
          ) : null}
          <div className="metrics-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={openSettings} disabled={!view}>
              <SlidersIcon width={16} height={16} />
              Supuestos
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()} disabled={!view}>
              <PrintIcon width={16} height={16} />
              Exportar PDF
            </button>
          </div>
        </div>
      </header>

      <MetricsToolbar
        period={period}
        filters={filters}
        platforms={view?.platforms ?? []}
        categories={view?.categories ?? []}
        onPeriodChange={(next) => setParams({ period: next === DEFAULT_PERIOD ? null : String(next) })}
        onFiltersChange={(patch) =>
          setParams({
            ...(patch.platform !== undefined ? { channel: patch.platform === "ALL" ? null : patch.platform } : {}),
            ...(patch.category !== undefined ? { category: patch.category } : {}),
          })
        }
      />

      {error ? (
        <Banner
          tone="danger"
          title="No pudimos cargar las métricas"
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void reload()}>
              Reintentar
            </button>
          }
        >
          {error}
        </Banner>
      ) : loading || !view ? (
        <div className="metrics-skeleton" aria-hidden="true">
          <div className="metrics-skeleton-insights">
            {[0, 1, 2].map((item) => (
              <div key={item} className="skeleton" />
            ))}
          </div>
          <div className="metrics-skeleton-kpis">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="skeleton" />
            ))}
          </div>
          <div className="skeleton metrics-skeleton-chart" />
        </div>
      ) : view.totals.leads === 0 ? (
        <div className="panel metrics-empty">
          {filtered ? (
            <EmptyState
              icon={<SearchIcon />}
              title="No hay datos con estos filtros"
              hint="Probá con otro canal, otra categoría o un período más largo."
              action={
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setParams({ channel: null, category: null })}
                >
                  Limpiar filtros
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={<ChartIcon />}
              title="Todavía no hay datos en este período"
              hint="Las métricas se arman solas con los leads y las conversaciones que llegan por tus canales."
              action={
                <Link to="/app/connections" className="btn btn-secondary btn-sm">
                  Conectar un canal
                </Link>
              }
            />
          )}
        </div>
      ) : (
        <div className="metrics-body">
          <InsightList insights={view.insights} />
          <KpiGrid view={view} onEditSettings={openSettings} />
          <LeadTrend view={view} />
          <div className="metrics-row">
            <Funnel view={view} />
            <CategoryBreakdown view={view} />
          </div>
          <ChannelTable view={view} />
          <div className="metrics-row">
            <SpeedPanel view={view} />
            <AgentPanel view={view} onEditSettings={openSettings} />
          </div>
          <Heatmap view={view} />
          <MethodNotes demo={METRICS_DEMO} />
        </div>
      )}

      {view ? (
        <SettingsDialog
          key={settingsOpen ? "open" : "closed"}
          open={settingsOpen}
          settings={view.settings}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setSettingsOpen(false);
            toast({ message: "Guardamos los supuestos y recalculamos las métricas." });
          }}
        />
      ) : null}
    </div>
  );
}
