import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const ROOT = dirname(fileURLToPath(import.meta.url))
export const ADMIN_DEV_PORT = 5175

export function adminContentSecurityPolicy(apiOrigin: string, forMeta = false): string {
  return [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${apiOrigin}`,
    forMeta ? '' : "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
  ]
    .filter(Boolean)
    .join('; ')
}

function securityMeta(apiOrigin: string): Plugin {
  return {
    name: 'boxlead-admin-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler() {
        return [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: adminContentSecurityPolicy(apiOrigin, true) },
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, ROOT, 'VITE_')
  const apiBaseUrl = env.VITE_API_BASE_URL
  if (command === 'build' && !apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is required to build the backoffice')
  }

  return {
    root: resolve(ROOT, 'admin'),
    envDir: ROOT,
    cacheDir: resolve(ROOT, 'node_modules/.vite-admin'),
    plugins: [react(), ...(apiBaseUrl ? [securityMeta(new URL(apiBaseUrl).origin)] : [])],
    build: {
      outDir: resolve(ROOT, 'dist-admin'),
      emptyOutDir: true,
      assetsInlineLimit: 0,
      modulePreload: { polyfill: false },
    },
    server: {
      port: ADMIN_DEV_PORT,
      strictPort: true,
    },
  }
})
