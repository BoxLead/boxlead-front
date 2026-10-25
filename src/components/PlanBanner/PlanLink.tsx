import { Link } from "react-router-dom";
import type { NoticeAction } from "./planNotice";

export function PlanLink({ action }: { action: NoticeAction }) {
  if (action.external) {
    return (
      <a className="btn btn-secondary btn-sm" href={action.href} rel="noopener noreferrer">
        {action.label}
      </a>
    );
  }
  return (
    <Link className="btn btn-secondary btn-sm" to={action.href}>
      {action.label}
    </Link>
  );
}
