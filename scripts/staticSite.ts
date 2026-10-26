import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { brotliCompressSync, gzipSync } from 'node:zlib'

export const APP_PREFIX = '/app'
export const APP_SHELL_FILE = 'app.html'
export const NOT_FOUND_FILE = '404.html'

export type Resolution =
  | { kind: 'redirect'; location: string }
  | { kind: 'file'; file: string; status: number }
  | { kind: 'next' }

function lastSegment(pathname: string): string {
  return pathname.slice(pathname.lastIndexOf('/') + 1)
}

export function resolveRequest(pathname: string, exists: (file: string) => boolean): Resolution {
  if (pathname.length > 1 && pathname.endsWith('/')) return { kind: 'redirect', location: pathname.replace(/\/+$/, '') }
  if (pathname === '/index.html') return { kind: 'redirect', location: '/' }
  if (pathname === `/${APP_SHELL_FILE}` || pathname === `/${NOT_FOUND_FILE}`) {
    return { kind: 'file', file: NOT_FOUND_FILE, status: 404 }
  }
  if (pathname.endsWith('.html')) return { kind: 'redirect', location: pathname.slice(0, -5) }
  if (pathname === APP_PREFIX || pathname.startsWith(`${APP_PREFIX}/`)) return { kind: 'file', file: APP_SHELL_FILE, status: 200 }
  if (pathname === '/') return { kind: 'file', file: 'index.html', status: 200 }
  if (lastSegment(pathname).includes('.')) return exists(pathname.slice(1)) ? { kind: 'next' } : { kind: 'file', file: NOT_FOUND_FILE, status: 404 }
  const page = `${pathname.slice(1)}.html`
  return exists(page) ? { kind: 'file', file: page, status: 200 } : { kind: 'file', file: NOT_FOUND_FILE, status: 404 }
}

export function staticSiteMiddleware(outDir: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    const url = new URL(req.url ?? '/', 'http://localhost')
    const resolution = resolveRequest(decodeURIComponent(url.pathname), (file) => existsSync(join(outDir, file)))
    if (resolution.kind === 'next') return next()
    if (resolution.kind === 'redirect') {
      res.statusCode = 301
      res.setHeader('Location', `${resolution.location}${url.search}`)
      res.end()
      return
    }
    const accepted = String(req.headers['accept-encoding'] ?? '')
    const raw = readFileSync(join(outDir, resolution.file))
    const encoding = /\bbr\b/.test(accepted) ? 'br' : /\bgzip\b/.test(accepted) ? 'gzip' : null
    const body = encoding === 'br' ? brotliCompressSync(raw) : encoding === 'gzip' ? gzipSync(raw) : raw
    res.statusCode = resolution.status
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Vary', 'Accept-Encoding')
    if (encoding) res.setHeader('Content-Encoding', encoding)
    res.setHeader('Content-Length', body.length)
    res.end(req.method === 'HEAD' ? undefined : body)
  }
}
