import { useMemo } from "react";
import type { AdminPage } from "../../api/types";
import { DataTable } from "../../components/list/DataTable";
import { useAdminQuery } from "../../components/list/useAdminQuery";
import { formatCount, formatDate, formatMicros } from "../../format";
import { addDays, lastMomentBefore, today } from "./dates";
import { formatLimit } from "./limits";
import { ErrorBlock, Facts, LoadingBlock, Muted, Section } from "./parts";
import type { Entitlements, UsageRow } from "./types";

const DAYS = 30;
const REPLIES = "AGENT_REPLIES";

function cost(row: UsageRow): string {
  if (row.estimatedCostMicros === null || !row.costCurrency) return "Sin costo";
  return formatMicros(row.estimatedCostMicros, row.costCurrency);
}

export function UsagePanel({ userId, entitlements }: { userId: string; entitlements: Entitlements }) {
  const search = useMemo(() => {
    const to = today();
    return new URLSearchParams({ from: addDays(to, 1 - DAYS), to, userId }).toString();
  }, [userId]);
  const query = useAdminQuery<AdminPage<UsageRow>>("/admin/usage", search);
  const replies = entitlements.usage[REPLIES] ?? 0;

  return (
    <Section title="Uso" hint={`Respuestas del período y uso de IA de los últimos ${DAYS} días.`} wide>
      <Facts
        columns={2}
        items={[
          {
            label: "Respuestas del agente en el período",
            value: `${formatCount(replies)} de ${formatLimit("AGENT_REPLIES_PER_PERIOD", entitlements.limits.AGENT_REPLIES_PER_PERIOD)}`,
          },
          { label: "Período", value: `${formatDate(entitlements.period.start)} al ${formatDate(lastMomentBefore(entitlements.period.end))}` },
        ]}
      />
      {query.status === "loading" ? (
        <LoadingBlock rows={3} />
      ) : query.status === "error" ? (
        <ErrorBlock title="No pudimos cargar el uso de IA" message={query.message} onRetry={query.reload} />
      ) : query.data.items.length === 0 ? (
        <Muted>No usó IA en los últimos {DAYS} días.</Muted>
      ) : (
        <div className="customer-table">
          <DataTable
            caption="Uso de IA por día y modelo"
            rows={query.data.items}
            rowKey={(row) => `${row.day}-${row.agentId ?? ""}-${row.model}`}
            dense
            columns={[
              { key: "day", header: "Día", type: "date", cell: (row) => formatDate(row.day) },
              { key: "model", header: "Modelo", type: "id", cell: (row) => row.model },
              { key: "runs", header: "Corridas", type: "number", cell: (row) => formatCount(row.runs) },
              { key: "input", header: "Tokens de entrada", type: "number", cell: (row) => formatCount(row.inputTokens) },
              { key: "output", header: "Tokens de salida", type: "number", cell: (row) => formatCount(row.outputTokens) },
              { key: "cost", header: "Costo estimado", type: "money", cell: cost },
            ]}
          />
          {query.data.totalItems > query.data.items.length ? (
            <Muted>
              Mostramos {formatCount(query.data.items.length)} de {formatCount(query.data.totalItems)} filas. El resto está en Uso de IA.
            </Muted>
          ) : null}
        </div>
      )}
    </Section>
  );
}
