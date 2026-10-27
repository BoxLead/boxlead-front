import type { ReactNode } from "react";
import { PageHeader, type Crumb } from "./PageHeader";
import { useTitle } from "./useTitle";
import "./Screen.css";

type ScreenProps = {
  title: string;
  description?: ReactNode;
  back?: Crumb;
  crumbs?: readonly Crumb[];
  actions?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
};

export function Screen({ title, description, back, crumbs, actions, meta, children }: ScreenProps) {
  useTitle(title);
  return (
    <div className="page screen">
      <PageHeader title={title} description={description} crumbs={crumbs ?? (back ? [back] : undefined)} actions={actions} meta={meta} />
      {children}
    </div>
  );
}
