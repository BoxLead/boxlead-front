import type { ReactNode } from "react";

type AccountRowProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
};

export function AccountRow({ title, description, action, children }: AccountRowProps) {
  return (
    <div className="account-row">
      <div className="account-row-text">
        <h3 className="account-row-title">{title}</h3>
        {description ? <p className="account-row-desc">{description}</p> : null}
      </div>
      <div className="account-row-body">
        {children}
        {action ? <div className="account-row-action">{action}</div> : null}
      </div>
    </div>
  );
}
