# BoxLead Frontend

SPA for BoxLead: a public landing page plus the app (inbox, leads, connections). Deployed as static assets to S3 + CloudFront.

**Stack:** Node 24, Vite 8, React 19, TypeScript 6 (strict), react-router-dom 7, vanilla CSS, ESLint 10, Docker + nginx.

## Structure

```
index.html            # Entry HTML, SEO metadata
Dockerfile            # Multi-stage build: lint, test, build, export (static files), runtime (nginx)
docker/nginx.conf     # SPA fallback, caching, security headers, /healthz
docker-compose.yml    # Runs the production image locally
public/               # favicon, og-image, robots.txt, sitemap.xml
e2e/                  # Playwright specs and mock-api/ (stateful mock of the backend contract)
src/
├── main.tsx          # BrowserRouter > AuthProvider > ToastProvider > App
├── App.tsx           # Routes (everything but the landing is lazy-loaded)
├── index.css         # Design tokens (--signal-*) and shared primitives (.btn, .panel, .page, .skeleton)
├── api/              # HTTP client and API types
├── context/          # AuthProvider (AuthContext.tsx) and useAuth (auth.ts)
├── data/             # queryCache (shared request cache behind useApiQuery) and lead mutations
├── hooks/            # useApiQuery, useConnectPlatform, useDocumentTitle
├── platforms/        # One definition per channel (MELI, WhatsApp, Instagram, Messenger) and the registry
├── components/       # ProtectedRoute, Layout, Sidebar, AuthLayout, Logo, icons, StatusSelect, CategorySelect, EmptyState, Loading, ScrollToTop
│   └── ui/           # Banner, ChoiceGroup, Tag, Avatar, CharCounter, ConfirmDialog, toasts
├── pages/            # Login, Register, Inbox, Leads, LeadDetail, Categories, Connections, OAuthCallback, Legal
├── landing/          # Public landing: LandingPage and its sections
└── util/             # company, format, labels, oauth, redirect, facebook-sdk
terraform/            # Infrastructure (do not modify without approval)
```

## Routes

```
/                                   Landing (public)
/login, /register                   Auth (public)
/privacy-policy, /terms-of-service, /data-deletion   Legal (public)
/app/inbox, /app/leads, /app/leads/:leadId, /app/categories, /app/connections   Protected
/app/oauth/callback/:platform       Protected
*                                   Redirects to /
```

Inbox and leads state lives in the URL: `/app/inbox?channel=MELI&stage=PRE_SALE&unread=1&id=<id>` and `/app/leads?status=NEW&channel=MELI&buyers=1&category<id or none>`. Protected routes send anonymous visitors to `/login?next=<app path>`; only same-origin `/app` paths are accepted as `next` (`util/redirect.ts`).

## Categories

Each lead belongs to at most one category (`categoryId`). Categories come from `GET /categories` (`data/categories.ts`), every account starts with four defaults, and colors are a fixed palette mapped to `category-color-*` classes in `index.css`. Assigning goes through `PUT /leads/{id}/category` with an optimistic update. Deleting a category leaves its leads without one.

## Channels

Everything that differs between channels lives in `src/platforms/<channel>.tsx`: name, logo, what it syncs, how it connects, sales stages, reply rules (thread kind, character limit, hint), error explanations, contact links and context status labels. Pages read the registry (`getPlatform`, `CONNECTABLE_PLATFORMS`) and never branch on a platform id. Instagram comments are `COMMENT` messages inside the chat of the person who wrote them, shown as events with a link to the post (`/conversations/{id}/context` returns `POST` items) and answered in public through `commentReply`. MercadoLibre pre-sale threads are questions paired with their answers (`{questionId}:answer`), post-sale threads are chats with the order from `/conversations/{id}/context`.

## Conventions

- Never use `any`; use `unknown` and narrow.
- `type` aliases and `import type` for type-only imports.
- Named exports, except `App`.
- Components use the `function` keyword, one per file, with a co-located `.css` file.
- No inline styles and no CSS frameworks. Tokens: `--signal-*` for the app, `--landing-*` for the landing.
- No comments in code.
- UI copy is in Spanish; the legal pages stay in English.
- Load data with `useApiQuery` (shared cache, `refreshInterval` polls only while the tab is visible); mutations call `api` and then `invalidateQueries` or `setQueryData`.
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

- The session is an `httpOnly`, `Secure` cookie set by the API. The frontend never stores or reads the token and does not use `localStorage`; the user lives in memory and comes from `GET /auth/me`.
- `AuthProvider` asks `GET /auth/me` only on `/app`, `/login` and `/register`, and shows a loader there until it answers, so the landing never calls the API.
- Every request sends `credentials: "include"` and `X-Requested-With: boxlead-web` (the API's CSRF check). The API must allow the app origin with credentials in CORS.
- Production builds inject a Content Security Policy `<meta>` from `vite.config.ts`. A new external origin (script, API, frame) must be added there or it will be blocked.
- No third-party assets besides the Facebook SDK (WhatsApp signup); fonts are self-hosted.
- OAuth redirects go through `beginOAuthRedirect` and are checked on return with `consumeOAuthSession` (`state` validation).
- Never render API or user content as HTML, and never accept `postMessage` data without an exact origin check.
- Response headers that a `<meta>` tag cannot set (HSTS, `frame-ancestors`) are only sent by the nginx image; for S3 + CloudFront they must be configured at the CDN.

## Safety

Do not modify without explicit approval: `terraform/`, `.github/workflows/`, `.env.example`, or the behavior of `ProtectedRoute.tsx`.

Run `npm run lint`, `npm run build`, `npm test` and `npm run test:e2e` before considering work complete. New behaviour gets unit tests next to the code (`*.test.ts(x)`) and an end-to-end spec in `e2e/`, with the mock API extended to match the backend contract.
