import { useMemo } from "react";
import { encode } from "uqr";
import "./QrCode.css";

const BORDER = 2;

function qrPath(data: boolean[][]): string {
  const parts: string[] = [];
  data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) parts.push(`M${x} ${y}h1v1h-1z`);
    }),
  );
  return parts.join("");
}

export function QrCode({ value, label }: { value: string; label: string }) {
  const qr = useMemo(() => encode(value, { ecc: "M", border: BORDER }), [value]);
  return (
    <svg
      className="qr-code"
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect className="qr-code-light" width={qr.size} height={qr.size} />
      <path className="qr-code-dark" d={qrPath(qr.data)} />
    </svg>
  );
}
