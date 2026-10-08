import type { ReactNode } from "react";
import "./DataTable.css";

type DataTableProps = {
  caption: string;
  columns: string[];
  rows: ReactNode[][];
};

export function DataTable({ caption, columns, rows }: DataTableProps) {
  return (
    <details className="data-table">
      <summary>Ver datos</summary>
      <div className="data-table-scroll" tabIndex={0} role="region" aria-label={caption}>
        <table>
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) =>
                  cellIndex === 0 ? (
                    <th key={cellIndex} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={cellIndex}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
