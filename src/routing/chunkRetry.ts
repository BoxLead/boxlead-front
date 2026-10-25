export const CHUNK_RELOAD_KEY = "boxlead.chunk-reload";

export type ChunkLoader<T> = () => Promise<T>;

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "ChunkLoadError" ||
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
      error.message,
    )
  );
}

function reloadedAlready(): boolean {
  try {
    return sessionStorage.getItem(CHUNK_RELOAD_KEY) !== null;
  } catch {
    return true;
  }
}

function markReload(): void {
  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    return;
  }
}

export function clearReloadMark(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    return;
  }
}

export function loadChunk<T>(
  load: ChunkLoader<T>,
  reload: () => void = () => window.location.reload(),
): Promise<T> {
  return load().then(
    (loaded) => {
      clearReloadMark();
      return loaded;
    },
    (error: unknown) => {
      if (!isChunkLoadError(error) || reloadedAlready()) throw error;
      markReload();
      reload();
      return new Promise<T>(() => undefined);
    },
  );
}
