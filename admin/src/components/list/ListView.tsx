import type { ReactNode } from "react";
import { EmptyState } from "../../../../src/components/EmptyState/EmptyState";
import { Banner } from "../../../../src/components/ui/Banner";
import type { AdminPage } from "../../api/types";
import { TableSkeleton } from "../Skeleton";
import { DataTable, type Column } from "./DataTable";
import { Pagination } from "./Pagination";
import type { ListQueryResult } from "./useListQuery";
import "./List.css";

type ListViewProps<T> = {
  caption: string;
  query: ListQueryResult<AdminPage<T>>;
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

function beyondLastPage(page: AdminPage<unknown>): boolean {
  return page.items.length === 0 && page.page > 0 && page.totalItems > 0;
}

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
  const clearButton =
    filtered && onClearFilters ? (
      <button type="button" className="btn btn-secondary btn-sm" onClick={onClearFilters}>
        Limpiar filtros
      </button>
    ) : null;

  return (
    <section className="list-view" aria-label={caption}>
      {filters}
      <div className={plain ? "list-body" : "panel list-panel"}>
        {query.status === "loading" ? (
          <TableSkeleton columns={Math.min(columns.length, 6)} />
        ) : query.status === "invalid" ? (
          <div className="list-error">
            <Banner tone="warning" title="Revisá los filtros" action={clearButton}>
              {query.message}
            </Banner>
          </div>
        ) : query.status === "error" ? (
          <div className="list-error">
            <Banner
              tone="danger"
              title="No pudimos cargar la lista"
              action={
                <>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={query.reload}>
                    Reintentar
                  </button>
                  {clearButton}
                </>
              }
            >
              {query.message}
            </Banner>
          </div>
        ) : beyondLastPage(query.data) ? (
          <EmptyState
            illustration="search"
            title="Esta página está vacía"
            hint="La lista cambió y esta página ya no tiene filas."
            action={
              <button type="button" className="btn btn-secondary" onClick={() => onPageChange(0)}>
                Ir a la primera página
              </button>
            }
          />
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
