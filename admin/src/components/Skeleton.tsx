import "./Skeleton.css";

function range(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

export function TableSkeleton({ columns = 4, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="skeleton-table" role="status" aria-label="Cargando">
      <div className="skeleton-row skeleton-row-head">
        {range(columns).map((column) => (
          <span key={column} className="skeleton skeleton-cell skeleton-cell-head" />
        ))}
      </div>
      {range(rows).map((row) => (
        <div key={row} className="skeleton-row">
          {range(columns).map((column) => (
            <span key={column} className="skeleton skeleton-cell" />
          ))}
        </div>
      ))}
      <span className="visually-hidden">Cargando…</span>
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-cards" role="status" aria-label="Cargando">
      {range(count).map((card) => (
        <div key={card} className="panel skeleton-card">
          <span className="skeleton skeleton-line skeleton-line-short" />
          <span className="skeleton skeleton-line skeleton-line-tall" />
          <span className="skeleton skeleton-line" />
        </div>
      ))}
      <span className="visually-hidden">Cargando…</span>
    </div>
  );
}

export function FactsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-facts" role="status" aria-label="Cargando">
      {range(rows).map((row) => (
        <div key={row} className="skeleton-fact">
          <span className="skeleton skeleton-line skeleton-line-short" />
          <span className="skeleton skeleton-line" />
        </div>
      ))}
      <span className="visually-hidden">Cargando…</span>
    </div>
  );
}
