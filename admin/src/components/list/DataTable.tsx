import type { ReactNode } from "react";
import { cx } from "../../../../src/util/classNames";
import "./List.css";

export type ColumnType = "text" | "number" | "money" | "date" | "status" | "id" | "actions";

export type ColumnWidth = "xs" | "sm" | "md" | "lg" | "xl";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  type?: ColumnType;
  align?: "start" | "end";
  width?: ColumnWidth;
  truncate?: boolean;
};

type DataTableProps<T> = {
  caption: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  dense?: boolean;
};

const END_TYPES: ReadonlySet<ColumnType> = new Set(["number", "money", "actions"]);

function alignment<T>(column: Column<T>): "start" | "end" {
  if (column.align) return column.align;
  return column.type && END_TYPES.has(column.type) ? "end" : "start";
}

function classes<T>(column: Column<T>): string {
  return cx(
    `data-table-${column.type ?? "text"}`,
    alignment(column) === "end" && "data-table-end",
    column.width && `data-table-w-${column.width}`,
    column.truncate && "data-table-truncate",
  );
}

export function DataTable<T>({ caption, columns, rows, rowKey, dense = false }: DataTableProps<T>) {
  return (
    <div className="data-table-wrap">
      <table className={cx("data-table", dense && "data-table-dense")}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={classes(column)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} data-label={column.header} className={classes(column)}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
