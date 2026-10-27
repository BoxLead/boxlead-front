import type { ReactNode } from "react";
import { EmptyState } from "../../../../src/components/EmptyState/EmptyState";
import { Banner } from "../../../../src/components/ui/Banner";
import type { AdminPage } from "../../api/types";
import { TableSkeleton } from "../Skeleton";
import { DataTable, type Column } from "./DataTable";
import { Pagination } from "./Pagination";
import type { QueryResult } from "./useAdminQuery";
import "./List.css";

type ListViewProps<T> = {
  caption: string;
  query: QueryResult<AdminPage<T>> & { reload: () => void };
  columns: readonly Column<T>[];
  rowKey: (row: T) => string;
  filters?: ReactNode;
  filtered?: boolean;
  emptyTitle: string;
  emptyHint?: string;
  onClearFilters?: () => void;
  onPageChange: (page: number) => void;
  plain?: boolean;
};

export function ListView<T>({
  caption,
  query,
  columns,
  rowKey,
  filters,
  filtered = false,
  emptyTitle,
  emptyHint,
  onClearFilters,
  onPageChange,
  plain = false,
}: ListViewProps<T>) {
  return (
    <section className="list-view" aria-label={caption}>
      {filters}
      <div className={plain ? "list-body" : "panel list-panel"}>
        {query.status === "loading" ? (
          <TableSkeleton columns={Math.min(columns.length, 6)} />
        ) : query.status === "error" ? (
          <div className="list-error">
            <Banner
              tone="danger"
              title="No pudimos cargar la lista"
              action={
                <button type="button" className="btn btn-secondary btn-sm" onClick={query.reload}>
                  Reintentar
                </button>
              }
            >
              {query.message}
            </Banner>
          </div>
        ) : query.data.items.length === 0 ? (
          <EmptyState
            illustration="search"
            title={filtered ? "Nada coincide con estos filtros" : emptyTitle}
            hint={filtered ? "Probá con otros filtros o limpialos." : emptyHint}
            action={
              filtered && onClearFilters ? (
                <button type="button" className="btn btn-secondary" onClick={onClearFilters}>
                  Limpiar filtros
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <DataTable caption={caption} columns={columns} rows={query.data.items} rowKey={rowKey} />
            <Pagination
              page={query.data.page}
              size={query.data.size}
              totalItems={query.data.totalItems}
              shown={query.data.items.length}
              onChange={onPageChange}
            />
          </>
        )}
      </div>
    </section>
  );
}
