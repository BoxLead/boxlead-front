import type { PlatformType } from "../../api/types";
import { PlatformBadge } from "../../components/PlatformBadge/PlatformBadge";
import { formatShortDate } from "../../util/format";
import "./ThreadList.css";

export type ThreadListItem = {
  id: string;
  platform: PlatformType;
  title: string;
  subtitle: string;
  updatedAt: string;
};

type ThreadListProps = {
  items: ThreadListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  label: string;
};

export function ThreadList({
  items,
  selectedId,
  onSelect,
  label,
}: ThreadListProps) {
  return (
    <ul className="thread-list" aria-label={label}>
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <li key={item.id}>
            <button
              type="button"
              aria-current={active || undefined}
              className={`thread-item${active ? " thread-item-active" : ""}`}
              onClick={() => onSelect(item.id)}
            >
              <PlatformBadge platform={item.platform} iconOnly />
              <span className="thread-item-body">
                <span className="thread-item-top">
                  <span className="thread-item-title">{item.title}</span>
                  <time className="thread-item-time" dateTime={item.updatedAt}>
                    {formatShortDate(item.updatedAt)}
                  </time>
                </span>
                <span className="thread-item-subtitle">{item.subtitle}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ThreadListSkeleton() {
  return (
    <div className="thread-list-skeleton" aria-hidden="true">
      {[0, 1, 2, 3].map((row) => (
        <div className="thread-item-skeleton skeleton" key={row} />
      ))}
    </div>
  );
}
