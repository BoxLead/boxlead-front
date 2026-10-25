# BoxLead Frontend

SPA for BoxLead: a public landing page plus the app (inbox, leads, metrics, categories, connections). Deployed as static assets to S3 + CloudFront.

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
├── data/             # queryCache (shared request cache behind useApiQuery), lead and category mutations, metrics source and demo data, sign up plans
├── hooks/            # useApiQuery, useConnectPlatform, useDocumentTitle
├── platforms/        # One definition per channel (MELI, WhatsApp, Instagram, Messenger) and the registry
├── components/       # ProtectedRoute, Layout, Sidebar, AuthLayout, PlanPicker, Logo, icons, StatusSelect, CategorySelect, EmptyState, Loading, ScrollToTop
│   └── ui/           # Banner, ChoiceGroup, Tag, Avatar, AnimatedNumber, CharCounter, Dialog, ConfirmDialog, toasts
├── pages/            # Login, Register, Inbox, Leads, LeadDetail, Metrics, Categories, Connections, OAuthCallback, Legal, Billing, Reseller, Invitation, ConsumerRequest
├── landing/          # Public landing: LandingPage and its sections
└── util/             # classNames, company, dates, format, labels, legalAcceptance, links, metrics, oauth, planPrice, redirect, referral, facebook-sdk
terraform/            # Infrastructure (do not modify without approval)
```

## Routes

```
/                                   Landing (public)
/login, /register                   Auth (public)
/privacy-policy, /terms-of-service, /data-deletion   Legal (public)
/invitacion, /terminos, /privacidad, /contratos, /arrepentimiento, /baja   Payments placeholders (public, redirect to / for now)
/app/inbox, /app/leads, /app/leads/:leadId, /app/metrics, /app/categories, /app/connections   Protected
/app/billing, /app/billing/return   Protected, only with features.billing
/app/reseller                       Protected, only with isReseller
/app/oauth/callback/:platform       Protected
*                                   Redirects to /
```

Inbox, leads and metrics state lives in the URL: `/app/inbox?channel=MELI&stage=PRE_SALE&unread=1&id=<id>`, `/app/leads?status=NEW&channel=MELI&buyers=1&category=<id or none>&temperature=<COLD, WARM, HOT or none>` and `/app/metrics?period=7&metric=sales&channel=WHATSAPP&category=<id or none>` (the period is 7, 30 or 90 days and defaults to 30, the metric defaults to leads). Protected routes send anonymous visitors to `/login?next=<app path>`; only same-origin `/app` paths are accepted as `next` (`util/redirect.ts`).

## Social login

Login and register offer "Continuar con Google" and "Continuar con Facebook" next to the email and password form, which stays as it was. The buttons use the Auth0 React SDK (`context/SocialAuthProvider.tsx`, `hooks/useSocialLogin.ts`) and only appear when `VITE_AUTH0_DOMAIN` and `VITE_AUTH0_CLIENT_ID` are set. The SDK never owns the session: it sends the visitor to Auth0, `/social/callback` (`pages/SocialCallback`) completes the redirect by hand, takes the ID token and posts it to `POST /auth/social`, and the API answers with the same `httpOnly` cookie as the password login. The SDK keeps nothing after that (`logout({ openUrl: false })`). Providers live in `util/social.ts`. Auth0 must list `<origin>/social/callback` as a callback URL. The e2e specs answer for Auth0 with `routeAuth0` in `e2e/support.ts`.

## Payments

Billing, invitations, referrals and the legal pages are built behind the flags core sends in `GET /auth/me`. `toAuthUser` keeps `features`, `access`, `isReseller` and `pendingLegal`, and anything missing or unexpected reads as off, with `access` as `FULL`. `useAuth()` exposes the same four values. `FeatureRoute` sends `/app/billing` and `/app/reseller` to `/` when their flag is off, and the account menu only links Facturación, Revendedor and the consumer pages when core enables them. The pages are placeholders that later steps fill in. The contract lives in `boxlead-core/payments-plan/contracts/api-customer.md` and the types in `api/types.ts`. `api/errors.ts` reads the stable `code` and the `fields` of an error.

`/register` loads `GET /billing/plans`, `GET /invitations/current` and `GET /legal/documents` together and shows the loader until they answer or 5 seconds pass (`data/plans.ts`). Any answer but a 200 from the plans leaves the sign up as it was. With plans the visitor picks Starter or Business in `PlanPicker`, which leads with today's charge in pesos, the price without national taxes under its legend and the dollar reference (`util/planPrice.ts`). Enterprise only links to a conversation. The Beta is enabled only when the invitation answers, and then its email fills the form and cannot be changed. `?plan=` preselects a plan. The chosen plan travels only in the destination, `/app/billing?checkout=STARTER` or `BUSINESS` for a paid plan and `next` otherwise, always through `safeAppPath`. When the legal documents answer, a checkbox sends the terms and privacy versions as `acceptedLegal` in the sign up, and for Google or Facebook inside `appState` next to `next`, which `SocialCallback` passes on to `POST /auth/social`. Nothing about the plan goes to browser storage.

The mock API answers every endpoint of that contract from `e2e/mock-api/billing.ts`. The scenarios `billing-none`, `billing-demo`, `billing-active`, `billing-past-due`, `billing-suspended`, `billing-checkout-pending`, `billing-checkout-rejected`, `billing-downgrade-pending`, `billing-invited` and `reseller` turn billing and legal on and give the agents page two enabled agents. Every other scenario keeps the flags off and the new endpoints answer 404. `resetApi(scenario, now, { pendingLegal, entitlementsUnavailable })` adds pending legal versions or makes the agent answer 503, and `settleCheckout(status)` decides the open checkout as the Mercado Pago return would. The checkout URL always points to `www.mercadopago.com.ar`, so specs intercept it with `page.route`. Invitation tokens live in `INVITATION_TOKENS` and `billing-invited` behaves as if the invitation cookie of another email were already set. A social login with the demo user's email answers 409 `ACCOUNT_EXISTS_WITH_PASSWORD`, as core does for an account with a password. Paid plans carry a USD `price`, the ARS `chargeToday` and a fixed `fxRate`, and `ENTERPRISE` is `contactOnly` with no price. Prices, rates and limits in the mock are made up for tests and are not the real catalog.

## Categories

Each lead belongs to at most one category (`categoryId`). Categories come from `GET /categories` (`data/categories.ts`), every account starts with four defaults, and colors are a fixed palette mapped to `category-color-*` classes in `index.css`. Assigning goes through `PUT /leads/{id}/category` with an optimistic update. Deleting a category leaves its leads without one.

## Temperature

Each lead has an optional temperature (`COLD`, `WARM`, `HOT`, or none when it is not evaluated yet). Agents set it from the conversation unless the business profile has `autoQualify` off. A person's choice (`TemperatureSelect` on Leads and LeadDetail, `PUT /leads/{id}/temperature` through `assignLeadTemperature`, `null` clears it) locks it, so agents and the silent lead job leave it alone. Leads filters it with `temperature=COLD|WARM|HOT|none`. A lead counts as qualified when it is `WARM` or `HOT`, or its status is `QUALIFIED` or `CLOSED`, and the funnel reads that from `totals.qualified`.

## Metrics

The page reads `GET /metrics?from&to&timezone` for the current period, the previous one and the last 12 weeks, plus `GET /metrics/settings` for the assumptions (minutes per reply and business hours). The contract lives in `api/types.ts` and the backend brief in `boxlead-core/METRICS.md`. Every segment is one channel and one category, so filters are applied in the browser without new requests.

The mock API (`e2e/mock-api/metrics.ts`) builds the same report from the scenario data and answers `/metrics` and `/metrics/settings`. `/__reset` accepts a `now` so a spec that fixes the page clock sees the data relative to the same moment (`resetApi("showcase", NOW)`). The backend returns `agent: null` for now, so the agent rows of the attention card (agent time, solved by the agent, hours saved) stay hidden. A reply moves a `NEW` lead to `CONTACTED` by itself, in the API and in the mock.

The page only shows what BoxLead can measure. Sales and revenue are left out on purpose because they are hard to attribute, and ad spend for a cost per lead is the next step (see `METRICS.md`).

The page is built around one chart. The indicator tabs (leads, answered in 5 minutes, first response and qualification) switch it, compare with the previous period and show the 14 day estimate for leads. The funnel (leads, contacted, qualified) explains each step on hover, touch or focus and draws the previous period as an outline. The breakdown by channel or category filters the whole page when a row is clicked, and ignores its own filter so the other rows stay visible. Signals are at most three short lines, each rule needs a minimum sample and repeats nothing the page already shows.

`useMetricsView` only loads data. `buildMetricsView` and `buildChartData` turn the reports into what the page draws, and they, the model (`metricsModel`, `breakdown`, `hours`, `series`), the signals, the forecast and the chart layouts are pure functions with unit tests. Charts are plain SVG with no chart library, read with pointer, touch and keyboard, and only announce what the keyboard reaches. Qualification counts the leads of the period that are qualified today, the same as the funnel. Rates and response times use a 7 day rolling window, the 90 day view and sparse counts are drawn in full weeks, and the current day is drawn apart because it is not over. The forecast ignores the days before the first activity and waits for four weeks of data. Keep the page sober, one accent color for data and green or red only for changes.

## Channels

Everything that differs between channels lives in `src/platforms/<channel>.tsx`: name, logo, what it syncs, how it connects, sales stages, reply rules (thread kind, character limit, hint), error explanations, contact links and context status labels. Pages read the registry (`getPlatform`, `CONNECTABLE_PLATFORMS`) and never branch on a platform id. Instagram comments are `COMMENT` messages inside the chat of the person who wrote them, shown as events with a link to the post (`/conversations/{id}/context` returns `POST` items) and answered in public through `commentReply`. MercadoLibre pre-sale threads are questions paired with their answers (`{questionId}:answer`), post-sale threads are chats with the order from `/conversations/{id}/context`. WhatsApp only lets free text go within 24 hours of the last message from the customer, so the composer of a channel with `supportsTemplates` offers approved templates (`GET /conversations/{id}/templates`, sent as `template` on a message) and the closed-window error points to them.

## Conventions

- Never use `any`; use `unknown` and narrow.
- `type` aliases and `import type` for type-only imports.
- Named exports, except `App`.
- Components use the `function` keyword, one per file, with a co-located `.css` file.
- No inline styles and no CSS frameworks. Tokens: `--signal-*` for the app, `--landing-*` for the landing. Derive tints from a token with `color-mix` instead of writing a new color.
- Shared primitives live in `index.css` (`.btn`, `.btn-icon`, `.panel`, `.field`, `.input`, `.select`, `.form-error`) and in `components/ui` (`Dialog` for every modal). Compose conditional classes with `cx` from `util/classNames`.
- No comments in code.
- UI copy is in Spanish; the legal pages stay in English.
- Load data with `useApiQuery` (shared cache, `refreshInterval` polls only while the tab is visible); mutations call `api` and then `invalidateQueries` or `setQueryData`.
- Every page sets its tab title with `useDocumentTitle`.
- Styles used by more than one page belong in `index.css` or a shared component, never in a page stylesheet (pages are code-split).
- Every screen needs loading, empty and error states, and must work from 320px wide.
- Animations are CSS, except number tweens with `useAnimatedNumber`, and all of them respect `prefers-reduced-motion`.

## Landing

- Lives in `src/landing/`. Dark by default; `html[data-theme="light"] .landing` in `LandingPage.css` overrides the `--landing-*` tokens, so components must use tokens (or `color-mix` on them) and never hard-coded colors.
- `[data-reveal]` elements are revealed by the observer in `LandingPage.tsx`; scroll-driven effects sit behind `@supports (animation-timeline: view())`.
- Keep the legal entity, the legal page links and the support email in the footer (required for Meta app review).
- `BILLING_ENABLED` and `REFERRALS_ENABLED` in `src/landing/flags.ts` stay `false` until payments go live, and with both off the landing looks as it does today. The payments plan in `boxlead-core` turns them on in its step 23.
- `BILLING_ENABLED` shows the plans section (`PlansSection`, also linked from the header and footer). It lists Beta by invitation, Starter and Business with their capabilities, never amounts or limits, and leads to `/register?plan=STARTER` or `BUSINESS`. The price comes from the API inside the app.
- `REFERRALS_ENABLED` turns on `captureReferral` (`util/referral.ts`). A `?ref=` code in the referral format (10 Crockford base32 characters) goes into the `boxlead_ref` cookie for `ATTRIBUTION_WINDOW_DAYS`, `Secure` and `SameSite=Lax`, on `.boxlead.app` there and with no domain on other hosts. An existing cookie is never replaced (first touch), and `ref` leaves the URL through `history.replaceState` whether it was valid or not.

## Build and deploy

- The Dockerfile is the single source for the Node version; CI lints and builds through it.
- `VITE_API_BASE_URL` is a build argument baked into the bundle.
- CD builds and smoke-tests the image, then exports the static files to S3 + CloudFront.
- TypeScript stays below 6.1 until `typescript-eslint` supports newer versions.

## Security

- The session is an `httpOnly`, `Secure` cookie set by the API. The frontend never stores or reads the token and does not use `localStorage`; the user lives in memory and comes from `GET /auth/me`.
- `AuthProvider` asks `GET /auth/me` only on `/app`, `/login`, `/register` and `/invitacion`, and shows a loader there until it answers, so the landing never calls the API.
- Every request sends `credentials: "include"` and `X-Requested-With: boxlead-web` (the API's CSRF check). The API must allow the app origin with credentials in CORS.
- Production builds inject a Content Security Policy `<meta>` from `vite.config.ts`. A new external origin (script, API, frame) must be added there or it will be blocked.
- No third-party assets besides the Facebook SDK (WhatsApp signup); fonts are self-hosted.
- OAuth redirects go through `beginOAuthRedirect` and are checked on return with `consumeOAuthSession` (`state` validation).
- Never render API or user content as HTML, and never accept `postMessage` data without an exact origin check.
- Response headers that a `<meta>` tag cannot set (HSTS, `frame-ancestors`) come from the nginx image and, in production, from the CloudFront response headers policy in `terraform/cloudfront.tf`. Change both together.

## Safety

Do not modify without explicit approval: `terraform/`, `.github/workflows/`, `.env.example`, or the behavior of `ProtectedRoute.tsx`.

Run `npm run lint`, `npm run build`, `npm test` and `npm run test:e2e` before considering work complete. New behaviour gets unit tests next to the code (`*.test.ts(x)`) and an end-to-end spec in `e2e/`, with the mock API extended to match the backend contract.

### End-to-end isolation

Playwright runs `E2E_WORKERS` workers (4 locally, 2 in CI, `e2e/ports.ts`). The mock API keeps its state in memory, so each worker gets its own instance on `8090 + parallelIndex`, and the app always talks to `8090`: the `test` exported from `e2e/support.ts` rewrites those requests to the worker's instance. Import `test` and `expect` from `./support.ts`, never from `@playwright/test`, and use `mockApiUrl()` for direct calls. `login()` signs in through the API and skips the form; tests of the form itself fill it in by hand. Playwright needs Node 24 (`.ts` mock server) and runs in `test-results/`, so do not start two runs at once.

### Demo video

The `showcase` scenario of the mock API is a store with about 800 leads across the four channels, three agents with drafts, handoffs and activity, and six fixed conversations at the top of the inbox that the tour uses. `npm run demo:video` records the tour in three chapters (agents, inbox, metrics) plus leads and connections, with a visible cursor, chapter cards and a closing card, in the dark theme, and writes `demo-video/boxlead-demo.mp4` in 1440p. The camera never zooms. A soft spotlight marks what each caption talks about. Frames are captured at twice a 1280 by 720 viewport through the DevTools screencast and the captions are laid over them with ffmpeg in a single pass. Start `npm run mock-api` and `npm run dev:mock` first and set `FFMPEG` to a full ffmpeg build. `DEMO_APP_URL`, `DEMO_API_URL` and `DEMO_SPEED` change the defaults, and `--encode-only` rebuilds the video from the last recording. Everything in it is demo data, so the closing card says so. The landing shows a lighter 1080p copy with its poster from `public/demo`, so a new take means replacing both files and the duration in `DemoVideo.tsx`. `npm run demo:promo` makes the 45 second vertical ad for social networks from the same servers and scenario. It renders a stage that holds the mobile app in a framed iframe, drives every animation from the frame time so the cut is exact and the machine load does not matter, captures each frame as PNG and writes the 9 by 16 and 1 by 1 videos from their own layouts, a poster and one still per scene in `promo-video`. The vertical one shows the whole mobile screen and the square one frames each plane closer. `PROMO_TIMES=1.5,12` renders only those seconds to check a scene, `PROMO_FORMATS=vertical` records one layout, and `PROMO_FORCE=1` skips the load check.
