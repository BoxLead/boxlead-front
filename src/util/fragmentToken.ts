export function readFragmentToken(hash: string): string | null {
  const token = (hash.startsWith("#") ? hash.slice(1) : hash).trim();
  return token === "" ? null : token;
}

export function takeFragmentToken(): string | null {
  const { hash, pathname, search } = window.location;
  if (hash) window.history.replaceState(window.history.state, "", `${pathname}${search}`);
  return readFragmentToken(hash);
}
