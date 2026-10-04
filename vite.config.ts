import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const FACEBOOK_SOURCES = 'https://*.facebook.com https://*.facebook.net https://*.fbcdn.net'
const MERCADOLIBRE_IMAGES = 'https://*.mlstatic.com'

function contentSecurityPolicy(apiBaseUrl: string | undefined): Plugin {
  const apiOrigin = apiBaseUrl ? new URL(apiBaseUrl).origin : ''
  const policy = [
    "default-src 'self'",
    `script-src 'self' https://connect.facebook.net`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    `img-src 'self' data: ${FACEBOOK_SOURCES} ${MERCADOLIBRE_IMAGES}`,
    `connect-src 'self' ${apiOrigin} ${FACEBOOK_SOURCES}`.replace(/\s+/g, ' '),
    `frame-src ${FACEBOOK_SOURCES}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
        injectTo: 'head-prepend',
      },
    ],
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [react(), contentSecurityPolicy(env.VITE_API_BASE_URL)],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
