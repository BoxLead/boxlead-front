import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export function Billing() {
  useDocumentTitle("Facturación");

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Facturación</h1>
      </header>
    </div>
  );
}
