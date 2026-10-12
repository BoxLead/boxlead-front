import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { PlatformType } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ChartIcon, SearchIcon } from "../../components/icons/UiIcons";
import { Banner } from "../../components/ui/Banner";
import { useToast } from "../../components/ui/toast";
import { cx } from "../../util/classNames";
import { METRICS_DEMO } from "../../data/metrics";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { CONNECTABLE_PLATFORMS } from "../../platforms";
import { PERIODS, type MetricsPeriod } from "../../util/metrics";
import { AttentionCard } from "./AttentionCard";
import { Breakdown } from "./Breakdown.tsx";
import { FunnelCard } from "./FunnelCard";
import { HoursCard } from "./HoursCard";
import { MetricsHeader } from "./MetricsHeader";
import type { MetricsFilters } from "./metricsModel";
import { Performance } from "./Performance";
import { METRICS, type MetricKey } from "./series";
import { SettingsDialog } from "./SettingsDialog";
import { Signals } from "./Signals";
import { useMetricsView } from "./useMetricsView";
import "./Metrics.css";

const DEFAULT_PERIOD: MetricsPeriod = 30;

function parsePeriod(value: string | null): MetricsPeriod {
  return PERIODS.find((days) => String(days) === value) ?? DEFAULT_PERIOD;
}

function parseChannel(value: string | null): PlatformType | "ALL" {
  return CONNECTABLE_PLATFORMS.some((p) => p.id === value) ? (value as PlatformType) : "ALL";
}

function parseMetric(value: string | null): MetricKey {
  return METRICS.find((metric) => metric.key === value)?.key ?? "leads";
}

export function Metrics() {
  useDocumentTitle("Métricas");
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const period = parsePeriod(searchParams.get("period"));
  const metric = parseMetric(searchParams.get("metric"));
  const filters: MetricsFilters = {
    platform: parseChannel(searchParams.get("channel")),
    category: searchParams.get("category") || null,
  };
  const { view, updating, loading, error, reload } = useMetricsView(period, filters);
  const filtered = filters.platform !== "ALL" || filters.category !== null;

  function setParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  }

  function changeFilters(patch: Partial<MetricsFilters>) {
    setParams({
      ...(patch.platform !== undefined ? { channel: patch.platform === "ALL" ? null : patch.platform } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
    });
  }

  const openSettings = () => setSettingsOpen(true);

  return (
    <div className="page metrics">
      <MetricsHeader
        demo={METRICS_DEMO}
        period={period}
        filters={filters}
        platforms={view?.platforms ?? []}
        categories={view?.categories ?? []}
        range={view}
        onPeriodChange={(next) => setParams({ period: next === DEFAULT_PERIOD ? null : String(next) })}
        onFiltersChange={changeFilters}
        onEditSettings={openSettings}
      />

      <div className={cx("metrics-progress", updating && "metrics-progress-active")} aria-hidden="true" />

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
          <div className="skeleton metrics-skeleton-main" />
          <div className="metrics-skeleton-row">
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        </div>
      ) : view.totals.leads === 0 ? (
        <div className="panel metrics-empty">
          {filtered ? (
            <EmptyState
              icon={<SearchIcon />}
              title="No hay datos con estos filtros"
              action={
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => changeFilters({ platform: "ALL", category: null })}>
                  Limpiar filtros
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={<ChartIcon />}
              title="Todavía no hay datos en este período"
              hint="Se completan solas con los leads que llegan por tus canales."
              action={
                <Link to="/app/connections" className="btn btn-secondary btn-sm">
                  Conectar un canal
                </Link>
              }
            />
          )}
        </div>
      ) : (
        <div className={cx("metrics-body", updating && "metrics-body-updating")} aria-busy={updating}>
          <Signals insights={view.insights} />
          <Performance
            view={view}
            metric={metric}
            onMetricChange={(next) => setParams({ metric: next === "leads" ? null : next })}
          />
          <FunnelCard view={view} />
          <div className="metrics-grid">
            <Breakdown view={view} metric={metric} filters={filters} onFiltersChange={changeFilters} />
            <AttentionCard view={view} />
          </div>
          <HoursCard view={view} />
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
            toast({ message: "Guardamos los supuestos." });
          }}
        />
      ) : null}
    </div>
  );
}
