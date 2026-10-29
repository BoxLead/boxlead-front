import { useEffect, useState } from "react";
import { fetchAuthOptions, type AuthOptions } from "../data/account";

export function useAuthOptions(): AuthOptions | null {
  const [options, setOptions] = useState<AuthOptions | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAuthOptions().then((loaded) => {
      if (!cancelled) setOptions(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return options;
}
