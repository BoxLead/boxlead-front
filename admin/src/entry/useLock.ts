import { useEffect, useState } from "react";

export function useLock(until: string | null): boolean {
  const [now, setNow] = useState(() => Date.now());
  const ends = until ? Date.parse(until) : 0;
  const locked = ends > now;
  useEffect(() => {
    if (!locked) return;
    const timer = window.setTimeout(() => setNow(Date.now()), ends - Date.now() + 500);
    return () => window.clearTimeout(timer);
  }, [locked, ends]);
  return locked;
}
