export const TOKEN_PATHS: readonly string[] = ["/nueva-clave", "/confirmar-email", "/nuevo-email", "/invitacion"];

const tokenPaths = new Set(TOKEN_PATHS);

export function isTokenPath(pathname: string): boolean {
  return tokenPaths.has(pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname);
}
