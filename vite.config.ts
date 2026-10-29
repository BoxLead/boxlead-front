import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { prerenderSite, type RouteFiles } from './scripts/prerender'
import { staticSiteMiddleware } from './scripts/staticSite'

const FACEBOOK_SOURCES = 'https://*.facebook.com https://*.facebook.net https://*.fbcdn.net'
const MERCADOLIBRE_IMAGES = 'https://*.mlstatic.com'
const INSTAGRAM_IMAGES = 'https://*.cdninstagram.com'
const ANALYTICS_TAG = 'https://www.googletagmanager.com'
const ANALYTICS_COLLECT = 'https://*.google-analytics.com https://*.analytics.google.com'
const CLOUDFLARE_BEACON = 'https://static.cloudflareinsights.com'
const CLOUDFLARE_INSIGHTS = 'https://cloudflareinsights.com'

const ROUTE_ENTRIES: Record<string, string[]> = {
  '/': ['src/landing/LandingPage.tsx'],
  '/login': ['src/pages/Login/Login.tsx', 'src/components/AuthLayout/AuthLayout.tsx'],
  '/register': ['src/pages/Register/Register.tsx', 'src/components/AuthLayout/AuthLayout.tsx'],
  '/invitacion': ['src/pages/Invitation/Invitation.tsx', 'src/components/AuthLayout/AuthLayout.tsx'],
  '/social/callback': ['src/pages/SocialCallback/SocialCallback.tsx', 'src/components/AuthLayout/AuthLayout.tsx'],
  '/whatsapp': ['src/landing/pages/EditorialPage.tsx'],
  '/instagram': ['src/landing/pages/EditorialPage.tsx'],
  '/messenger': ['src/landing/pages/EditorialPage.tsx'],
  '/mercadolibre': ['src/landing/pages/EditorialPage.tsx'],
  '/agencias': ['src/landing/pages/EditorialPage.tsx'],
  '/terminos': ['src/pages/Legal/Terms.tsx'],
  '/privacidad': ['src/pages/Legal/Privacy.tsx'],
  '/contratos': ['src/pages/Legal/AdhesionContracts.tsx'],
  '/terms-of-service': ['src/pages/Legal/TermsOfService.tsx'],
  '/privacy-policy': ['src/pages/Legal/PrivacyPolicy.tsx'],
  '/data-deletion': ['src/pages/Legal/DataDeletion.tsx'],
  '/arrepentimiento': ['src/pages/ConsumerRequest/Withdrawal.tsx'],
  '/baja': ['src/pages/ConsumerRequest/Cancellation.tsx'],
  '/avisos/baja': ['src/pages/NotificationUnsubscribe/NotificationUnsubscribe.tsx', 'src/components/AuthLayout/AuthLayout.tsx'],
  '/app': ['src/components/Layout/Layout.tsx', 'src/pages/Inbox/Inbox.tsx'],
  '/app/leads': ['src/components/Layout/Layout.tsx', 'src/pages/Leads/Leads.tsx'],
  '/app/metrics': ['src/components/Layout/Layout.tsx', 'src/pages/Metrics/Metrics.tsx'],
  '/app/agents': ['src/components/Layout/Layout.tsx', 'src/pages/Agents/Agents.tsx'],
  '/app/categories': ['src/components/Layout/Layout.tsx', 'src/pages/Categories/Categories.tsx'],
  '/app/connections': ['src/components/Layout/Layout.tsx', 'src/pages/Connections/Connections.tsx'],
}

const PRELOAD_FONT = /inter-latin-wght-normal.*\.woff2$/

type OutputChunkLike = {
  type: 'chunk'
  fileName: string
  facadeModuleId: string | null
  isEntry: boolean
  imports: string[]
  viteMetadata?: { importedCss: Set<string> }
}

type BundleLike = Record<string, { type: string; fileName: string } | OutputChunkLike>

function originOf(baseUrl: string | undefined): string {
  return baseUrl ? new URL(baseUrl).origin : ''
}

export function contentSecurityPolicy(
  apiBaseUrl: string | undefined,
  agentApiBaseUrl: string | undefined,
  auth0Domain: string | undefined,
  inlineScriptHashes: string[] = [],
  analytics = false,
): string {
  const apiOrigin = originOf(apiBaseUrl)
  const agentApiOrigin = originOf(agentApiBaseUrl)
  const auth0Origin = auth0Domain ? `https://${auth0Domain}` : ''
  const hashes = inlineScriptHashes.map((hash) => `'sha256-${hash}'`).join(' ')
  const analyticsScript = analytics ? ANALYTICS_TAG : ''
  const analyticsConnect = analytics ? `${ANALYTICS_TAG} ${ANALYTICS_COLLECT}` : ''
  const analyticsImages = analytics ? ANALYTICS_COLLECT : ''
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes} https://connect.facebook.net ${CLOUDFLARE_BEACON} ${analyticsScript}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    `img-src 'self' data: ${FACEBOOK_SOURCES} ${MERCADOLIBRE_IMAGES} ${INSTAGRAM_IMAGES} ${analyticsImages}`,
    `connect-src 'self' ${apiOrigin} ${agentApiOrigin} ${auth0Origin} ${FACEBOOK_SOURCES} ${CLOUDFLARE_INSIGHTS} ${analyticsConnect}`,
    "media-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    `frame-src ${FACEBOOK_SOURCES} ${auth0Origin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ]
    .map((directive) => directive.replace(/\s+/g, ' ').trim())
    .join('; ')
}

function chunksByFacade(bundle: BundleLike): Map<string, OutputChunkLike> {
  const byFacade = new Map<string, OutputChunkLike>()
  for (const output of Object.values(bundle)) {
    if (output.type !== 'chunk') continue
    const chunk = output as OutputChunkLike
    if (chunk.facadeModuleId) byFacade.set(chunk.facadeModuleId.replace(/\\/g, '/'), chunk)
  }
  return byFacade
}

function filesFor(entries: string[], byFacade: Map<string, OutputChunkLike>, bundle: BundleLike): { scripts: string[]; styles: string[] } {
  const scripts = new Set<string>()
  const styles = new Set<string>()
  const visit = (chunk: OutputChunkLike) => {
    if (chunk.isEntry || scripts.has(chunk.fileName)) return
    scripts.add(chunk.fileName)
    chunk.viteMetadata?.importedCss.forEach((css) => styles.add(css))
    for (const imported of chunk.imports) {
      const next = bundle[imported]
      if (next && next.type === 'chunk') visit(next as OutputChunkLike)
    }
  }
  for (const entry of entries) {
    const chunk = [...byFacade.entries()].find(([facade]) => facade.endsWith(`/${entry}`))?.[1]
    if (chunk) visit(chunk)
  }
  return { scripts: [...scripts], styles: [...styles] }
}

export function routeHintsScript(base: string, routes: Record<string, { scripts: string[]; styles: string[] }>): string {
  const table = JSON.stringify(routes)
  return [
    '(function(){',
    `var routes=${table};`,
    'var path=location.pathname.replace(/\\/+$/,"")||"/";',
    'var key=Object.keys(routes).filter(function(k){return k==="/"?path==="/":path===k||path.indexOf(k+"/")===0;}).sort(function(a,b){return b.length-a.length;})[0];',
    'if(!key)return;',
    'var head=document.head;',
    `var base=${JSON.stringify(base)};`,
    'routes[key].scripts.forEach(function(f){var l=document.createElement("link");l.rel="modulepreload";l.crossOrigin="";l.href=base+f;head.appendChild(l);});',
    'routes[key].styles.forEach(function(f){var l=document.createElement("link");l.rel="preload";l.as="style";l.crossOrigin="";l.href=base+f;head.appendChild(l);});',
    '})();',
  ].join('')
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('base64')
}

type HintState = { base: string; routes: Record<string, RouteFiles> }

type SiteEnv = {
  apiBaseUrl: string | undefined
  agentApiBaseUrl: string | undefined
  auth0Domain: string | undefined
  analytics: boolean
  siteVerification: string | undefined
}

function htmlHints({ apiBaseUrl, agentApiBaseUrl, auth0Domain, analytics, siteVerification }: SiteEnv, state: HintState): Plugin {
  return {
    name: 'boxlead-html-hints',
    apply: 'build',
    configResolved(config) {
      state.base = config.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const bundle = (context.bundle ?? {}) as BundleLike
        const byFacade = chunksByFacade(bundle)
        const routes: Record<string, RouteFiles> = {}
        for (const [route, entries] of Object.entries(ROUTE_ENTRIES)) {
          const files = filesFor(entries, byFacade, bundle)
          if (files.scripts.length > 0) routes[route] = files
        }
        state.routes = routes
        const base = state.base
        const script = routeHintsScript(base, routes)
        const font = Object.keys(bundle).find((file) => PRELOAD_FONT.test(file))
        const tags: HtmlTagDescriptor[] = [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content: contentSecurityPolicy(apiBaseUrl, agentApiBaseUrl, auth0Domain, [sha256(script)], analytics),
            },
            injectTo: 'head-prepend',
          },
          { tag: 'script', children: script, injectTo: 'head' },
        ]
        if (siteVerification) {
          tags.push({ tag: 'meta', attrs: { name: 'google-site-verification', content: siteVerification }, injectTo: 'head' })
        }
        if (font) {
          tags.push({
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: true, href: `${base}${font}` },
            injectTo: 'head',
          })
        }
        return tags
      },
    },
  }
}

function staticSite(): Plugin {
  return {
    name: 'boxlead-static-site',
    configurePreviewServer(server) {
      server.middlewares.use(staticSiteMiddleware(resolve(server.config.root, server.config.build.outDir)))
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const hints: HintState = { base: '/', routes: {} }
  const root = process.cwd()
  const outDir = resolve(root, 'dist')
  const serverDir = resolve(outDir, 'server')

  return {
    plugins: [
      react(),
      htmlHints(
        {
          apiBaseUrl: env.VITE_API_BASE_URL,
          agentApiBaseUrl: env.VITE_AGENT_API_BASE_URL,
          auth0Domain: env.VITE_AUTH0_DOMAIN,
          analytics: Boolean(env.VITE_GA_MEASUREMENT_ID),
          siteVerification: env.VITE_GOOGLE_SITE_VERIFICATION,
        },
        hints,
      ),
      staticSite(),
    ],
    build: {
      modulePreload: { polyfill: false },
    },
    environments: {
      ssr: {
        build: {
          outDir: serverDir,
          copyPublicDir: false,
          rollupOptions: { input: 'src/entry-server.ts' },
        },
      },
    },
    builder: {
      async buildApp(builder) {
        await builder.build(builder.environments.client)
        await builder.build(builder.environments.ssr)
        await prerenderSite({ root, outDir, serverDir, base: hints.base, routes: hints.routes })
      },
    },
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
