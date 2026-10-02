# BoxLead Frontend

SPA for BoxLead: a public landing page plus the app (inbox, leads, connections). Deployed as static assets to S3 + CloudFront.

**Stack:** Node 24, Vite 8, React 19, TypeScript 6 (strict), react-router-dom 7, vanilla CSS, ESLint 10, Docker + nginx.

## Structure

```
index.html            # Entry HTML, SEO metadata
Dockerfile            # Multi-stage build: lint, build, export (static files), runtime (nginx)
docker/nginx.conf     # SPA fallback, caching, security headers, /healthz
docker-compose.yml    # Runs the production image locally
public/               # favicon, og-image, robots.txt, sitemap.xml
src/
├── main.tsx          # BrowserRouter > AuthProvider > App
├── App.tsx           # Routes (everything but the landing is lazy-loaded)
├── index.css         # Design tokens (--signal-*) and shared primitives (.btn, .panel, .page, .skeleton)
├── api/              # HTTP client and API types
├── context/          # AuthProvider (AuthContext.tsx) and useAuth (auth.ts)
├── hooks/            # useApiQuery, useDocumentTitle
├── components/       # ProtectedRoute, Layout, Sidebar, AuthLayout, Logo, icons, badges, EmptyState, Loading, ScrollToTop
├── pages/            # Login, Register, Inbox, Leads, LeadDetail, Connections, OAuthCallback, Legal
├── landing/          # Public landing: LandingPage and its sections
└── util/             # company, format, labels, oauth, facebook-sdk
terraform/            # Infrastructure (do not modify without approval)
```

## Routes

```
/                                   Landing (public)
/login, /register                   Auth (public)
/privacy-policy, /terms-of-service, /data-deletion   Legal (public)
/app/inbox, /app/leads, /app/leads/:leadId, /app/connections   Protected
/app/oauth/callback/:platform       Protected
*                                   Redirects to /
```

The inbox selection lives in the URL: `/app/inbox?tab=comments&id=<id>`.

## Conventions

- Never use `any`; use `unknown` and narrow.
- `type` aliases and `import type` for type-only imports.
- Named exports, except `App`.
- Components use the `function` keyword, one per file, with a co-located `.css` file.
- No inline styles and no CSS frameworks. Tokens: `--signal-*` for the app, `--landing-*` for the landing.
- No comments in code.
- UI copy is in Spanish; the legal pages stay in English.
- Load data with `useApiQuery`; mutations call `api` from `src/api/client.ts` directly.
- Every page sets its tab title with `useDocumentTitle`.
- Styles used by more than one page belong in `index.css` or a shared component, never in a page stylesheet (pages are code-split).
- Every screen needs loading, empty and error states, and must work from 320px wide.
- Animations are CSS only and respect `prefers-reduced-motion`.

## Landing

- Lives in `src/landing/`, dark theme only.
- `[data-reveal]` elements are revealed by the observer in `LandingPage.tsx`; scroll-driven effects sit behind `@supports (animation-timeline: view())`.
- Keep the legal entity, the legal page links and the support email in the footer (required for Meta app review).

## Build and deploy

- The Dockerfile is the single source for the Node version; CI lints and builds through it.
- `VITE_API_BASE_URL` is a build argument baked into the bundle.
- CD builds and smoke-tests the image, then exports the static files to S3 + CloudFront.
- TypeScript stays below 6.1 until `typescript-eslint` supports newer versions.

## Security

- The JWT lives in `localStorage` (`src/api/client.ts`); expired tokens are discarded on read. Moving it to an `httpOnly` cookie needs backend support.
- Production builds inject a Content Security Policy `<meta>` from `vite.config.ts`. A new external origin (script, API, frame) must be added there or it will be blocked.
- No third-party assets besides the Facebook SDK (WhatsApp signup); fonts are self-hosted.
- OAuth redirects go through `beginOAuthRedirect` and are checked on return with `consumeOAuthSession` (`state` validation).
- Never render API or user content as HTML, and never accept `postMessage` data without an exact origin check.
- Response headers that a `<meta>` tag cannot set (HSTS, `frame-ancestors`) are only sent by the nginx image; for S3 + CloudFront they must be configured at the CDN.

## Safety

Do not modify without explicit approval: `terraform/`, `.github/workflows/`, `.env.example`, or the behavior of `ProtectedRoute.tsx`.

Run `npm run lint` and `npm run build` before considering work complete.
