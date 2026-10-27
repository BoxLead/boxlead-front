import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../../../../src/components/icons/UiIcons";
import { formatCount } from "../../format";
import "./List.css";

type PaginationProps = {
  page: number;
  size: number;
  totalItems: number;
  shown: number;
  onChange: (page: number) => void;
};

export function Pagination({
  page,
  size,
  totalItems,
  shown,
  onChange,
}: PaginationProps) {
  const first = page * size + 1;
  const last = page * size + shown;
  const hasNext = last < totalItems;
  const single = page === 0 && !hasNext;
  return (
    <nav className="pagination" aria-label="Páginas">
      <p className="pagination-summary num">
        {shown === 0
          ? "Sin resultados en esta página"
          : `${formatCount(first)} a ${formatCount(last)} de ${formatCount(totalItems)}`}
      </p>
      {single ? null : (
        <div className="pagination-buttons">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page === 0}
            onClick={() => onChange(page - 1)}
          >
            <ChevronLeftIcon width={16} height={16} />
            Anterior
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!hasNext}
            onClick={() => onChange(page + 1)}
          >
            Siguiente
            <ChevronRightIcon width={16} height={16} />
          </button>
        </div>
      )}
    </nav>
  );
}
