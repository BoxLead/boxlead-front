import "./RollText.css";

export function RollText({ children }: { children: string }) {
  return (
    <span className="roll-text">
      <span className="roll-text-track">
        <span>{children}</span>
        <span aria-hidden="true">{children}</span>
      </span>
    </span>
  );
}
