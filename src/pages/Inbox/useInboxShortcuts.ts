import { useEffect, type RefObject } from "react";
import { useNavigate } from "react-router-dom";

type Options = {
  ids: string[];
  selectedId: string | null;
  linkFor: (id: string) => string;
  backTo: string;
  searchRef: RefObject<HTMLInputElement | null>;
  enabled?: boolean;
};

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function nextId(ids: string[], selectedId: string | null, step: 1 | -1): string | null {
  if (ids.length === 0) return null;
  const index = selectedId ? ids.indexOf(selectedId) : -1;
  if (index === -1) return step === 1 ? ids[0] : ids[ids.length - 1];
  const target = index + step;
  if (target < 0 || target >= ids.length) return null;
  return ids[target];
}

export function useInboxShortcuts({ ids, selectedId, linkFor, backTo, searchRef, enabled = true }: Options) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const typing = isTypingTarget(event.target);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (event.key === "Escape") {
        if (typing && event.target instanceof HTMLElement && event.target === searchRef.current) {
          event.target.blur();
          return;
        }
        if (!typing && selectedId) {
          event.preventDefault();
          navigate(backTo);
        }
        return;
      }
      if (typing) return;
      const step = event.key === "j" || event.key === "ArrowDown" ? 1 : event.key === "k" || event.key === "ArrowUp" ? -1 : 0;
      if (step === 0) return;
      const target = nextId(ids, selectedId, step);
      if (!target) return;
      event.preventDefault();
      navigate(linkFor(target), { replace: selectedId !== null });
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled, ids, selectedId, linkFor, backTo, searchRef, navigate]);
}
