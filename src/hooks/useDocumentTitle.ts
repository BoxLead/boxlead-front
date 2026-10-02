import { useEffect } from "react";
import { PRODUCT_NAME } from "../util/company";

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · ${PRODUCT_NAME}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
