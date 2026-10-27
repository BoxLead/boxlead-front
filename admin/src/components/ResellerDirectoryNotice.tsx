import { Banner } from "../../../src/components/ui/Banner";
import type { ResellerDirectory } from "../session/resellerDirectory";

export function ResellerDirectoryNotice({ directory }: { directory: ResellerDirectory }) {
  if (directory.status !== "error") return null;
  return (
    <Banner
      tone="warning"
      title="No pudimos cargar los revendedores"
      action={
        <button type="button" className="btn btn-secondary btn-sm" onClick={directory.reload}>
          Reintentar
        </button>
      }
    >
      Mientras tanto los nombres salen como id. {directory.message}
    </Banner>
  );
}
