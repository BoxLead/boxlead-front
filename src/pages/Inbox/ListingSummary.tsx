import type { ContextItem } from "../../api/types";
import { ExternalLinkIcon } from "../../components/icons/UiIcons";
import { Tag } from "../../components/ui/Tag";
import type { ContextStatus } from "../../platforms/types";
import { formatMoney } from "../../util/format";
import { safeExternalUrl } from "../../util/links";

type ListingSummaryProps = {
  item: ContextItem;
  status: ContextStatus | null;
  compact?: boolean;
};

export function ListingSummary({ item, status, compact = false }: ListingSummaryProps) {
  const title = item.title ?? `Publicación ${item.externalId}`;
  const itemUrl = safeExternalUrl(item.url);
  return (
    <div className={`listing${compact ? " listing-compact" : ""}`}>
      {item.imageUrl ? (
        <img
          className="listing-image"
          src={item.imageUrl}
          alt=""
          width={compact ? 40 : 56}
          height={compact ? 40 : 56}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="listing-image listing-image-empty" aria-hidden="true" />
      )}
      <span className="listing-body">
        <span className="listing-title">{title}</span>
        <span className="listing-meta">
          {item.price !== null ? <span className="listing-price">{formatMoney(item.price, item.currency)}</span> : null}
          {status && status.tone !== "success" ? <Tag tone={status.tone}>{status.label}</Tag> : null}
        </span>
      </span>
      {itemUrl ? (
        <a className="listing-link" href={itemUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLinkIcon width={16} height={16} />
          <span className="visually-hidden">Ver {title} en una pestaña nueva</span>
        </a>
      ) : null}
    </div>
  );
}
