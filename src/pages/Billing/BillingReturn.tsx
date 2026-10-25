import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export function BillingReturn() {
  useDocumentTitle("Estado del pago");

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Estado del pago</h1>
      </header>
    </div>
  );
}
