import { useCallback, useState } from "react";
import { useToast } from "../../../../src/components/ui/toast";
import { AdminApiError } from "../../api/errors";

export function invalid(message: string): never {
  throw new AdminApiError(message, 400, null);
}

export function useActionDialogs<K extends string>(onChanged: () => void) {
  const [open, setOpen] = useState<K | null>(null);
  const toast = useToast();
  const close = useCallback(() => setOpen(null), []);
  const run = useCallback(
    async <T>(call: () => Promise<T>, message: string | ((result: T) => string)) => {
      const result = await call();
      setOpen(null);
      onChanged();
      toast({ tone: "success", message: typeof message === "string" ? message : message(result) });
    },
    [onChanged, toast],
  );
  return { open, show: setOpen, close, run };
}
