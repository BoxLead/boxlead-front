import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const FACEBOOK_SOURCES = 'https://*.facebook.com https://*.facebook.net https://*.fbcdn.net'
const MERCADOLIBRE_IMAGES = 'https://*.mlstatic.com'
const INSTAGRAM_IMAGES = 'https://*.cdninstagram.com'

function originOf(baseUrl: string | undefined): string {
  return baseUrl ? new URL(baseUrl).origin : ''
}

function contentSecurityPolicy(apiBaseUrl: string | undefined, agentApiBaseUrl: string | undefined): Plugin {
  const apiOrigin = originOf(apiBaseUrl)
  const agentApiOrigin = originOf(agentApiBaseUrl)
  const policy = [
    "default-src 'self'",
    `script-src 'self' https://connect.facebook.net`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    `img-src 'self' data: ${FACEBOOK_SOURCES} ${MERCADOLIBRE_IMAGES} ${INSTAGRAM_IMAGES}`,
    `connect-src 'self' ${apiOrigin} ${agentApiOrigin} ${FACEBOOK_SOURCES}`.replace(/\s+/g, ' '),
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
    plugins: [react(), contentSecurityPolicy(env.VITE_API_BASE_URL, env.VITE_AGENT_API_BASE_URL)],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/agent-api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/agent-api/, ''),
        },
      },
    },
  }
})
