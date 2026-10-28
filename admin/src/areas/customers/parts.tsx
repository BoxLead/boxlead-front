import { Link } from "react-router-dom";
import { Banner } from "../../../../src/components/ui/Banner";
import { FactsSkeleton } from "../../components/Skeleton";
import { useResellerDirectory } from "../../session/resellerDirectory";

export { Facts, Muted, Section, SectionGrid, type Fact } from "../../components/Section";

export function ResellerLink({ id }: { id: string }) {
  const directory = useResellerDirectory();
  return (
    <Link className="entity-link" to={`/revendedores/${id}`}>
      {directory.find(id)?.displayName ?? "Ver revendedor"}
    </Link>
  );
}

export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return <FactsSkeleton rows={rows} />;
}

export function ErrorBlock({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <Banner
      tone="danger"
      title={title}
      action={
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Reintentar
        </button>
      }
    >
      {message}
    </Banner>
  );
}
