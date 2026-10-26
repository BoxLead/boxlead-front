import { useEffect } from "react";

const SUFFIX = "Backoffice de BoxLead";

export function useTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
  }, [title]);
}
