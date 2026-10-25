import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export function Reseller() {
  useDocumentTitle("Revendedor");

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Revendedor</h1>
      </header>
    </div>
  );
}
