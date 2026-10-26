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
├── main.tsx          # BrowserRouter > SocialAuthProvider > AuthProvider > ToastProvider > App
├── App.tsx           # Routes (every page is lazy-loaded through routing/lazyRoute)
├── routing/          # lazyRoute with chunk retry, route preload, RouteErrorBoundary, NotFound, ScrollRestoration, RouteAnnouncer
├── index.css         # Design tokens (--signal-*) and shared primitives (.btn, .panel, .page, .skeleton)
├── api/              # HTTP client and API types
├── context/          # AuthProvider (AuthContext.tsx) and useAuth (auth.ts)
├── data/             # queryCache (shared request cache behind useApiQuery), agui (AG-UI event stream reader), lead and category mutations, metrics source and demo data, sign up plans
├── hooks/            # useApiQuery, useConnectPlatform, useDocumentTitle, useUrlQuery, useRenderWindow
├── platforms/        # One definition per channel (MELI, WhatsApp, Instagram, Messenger) and the registry
├── components/       # ProtectedRoute, Layout, PlanBanner, LegalDialog, Sidebar, AuthLayout, PlanPicker, Logo, icons, StatusSelect, CategorySelect, EmptyState, Loading
│   ├── ProviderDetails/ # Catvin SRL details from util/company.ts, only the fields that have a value
│   └── ui/           # Banner, ChoiceGroup, Tag, Avatar, AnimatedNumber, CharCounter, Dialog, ConfirmDialog, toasts
├── pages/            # Login, Register, Inbox, Leads, LeadDetail, Metrics, Categories, Connections, OAuthCallback, Legal, Billing, Reseller, Invitation, ConsumerRequest
├── landing/          # Public landing: LandingPage and its sections
└── util/             # classNames, company, consumerPages, dates, format, labels, legalAcceptance, links, metrics, oauth, planPrice, redirect, referral, facebook-sdk
terraform/            # Infrastructure (do not modify without approval)
```

## Routes

```
/                                   Landing (public)
/login, /register                   Auth (public)
/terminos, /privacidad, /contratos  Legal texts in Spanish, the version that prevails (public)
/terms-of-service, /privacy-policy  English translations, plus /data-deletion (public)
/arrepentimiento, /baja             Withdrawal and cancellation requests without login (public)
/invitacion                         Demo invitation (public, token in the fragment)
/app/inbox, /app/leads, /app/leads/:leadId, /app/metrics, /app/categories, /app/connections   Protected
/app/billing, /app/billing/return   Protected, only with features.billing
/app/reseller                       Protected, only with isReseller
/app/oauth/callback/:platform       Protected
/app/*                              404 inside the app shell
*                                   404 page
```

Inbox, leads and metrics state lives in the URL: `/app/inbox?channel=MELI&stage=PRE_SALE&unread=1&q=<search>&id=<id>`, `/app/leads?status=NEW&channel=MELI&buyers=1&category=<id or none>&temperature=<COLD, WARM, HOT or none>&q=<search>` and `/app/metrics?period=7&metric=sales&channel=WHATSAPP&category=<id or none>` (the period is 7, 30 or 90 days and defaults to 30, the metric defaults to leads). Protected routes send anonymous visitors to `/login?next=<app path>`; only same-origin `/app` paths are accepted as `next` (`util/redirect.ts`).

### Routing

Every page is declared with `lazyRoute` in `App.tsx`. It wraps `React.lazy`, exposes `preload()` and reloads the page once when a chunk is missing after a deploy (`routing/chunkRetry.ts`, the mark lives in `sessionStorage`). `registerRoutePreload` maps a path prefix to the chunks it needs, the sidebar warms the route and its first query on hover, focus or touch, and the current route is warmed on idle at startup. The production `index.html` also gets a hashed inline script from `vite.config.ts` that adds `modulepreload` hints for the chunks of the current path and a preload for the latin Inter font. `RouteErrorBoundary` wraps the whole tree and each app page, it shows a retry and explains a missing chunk. `ScrollRestoration` keeps the scroll position per history entry and restores it on back and forward, `RouteAnnouncer` announces the new title and moves the focus to the page heading, and sidebar links navigate with a view transition that is disabled under `prefers-reduced-motion`. `RouteErrorBoundary` is the one class component in the codebase because React only exposes error boundaries as classes.

The inbox has keyboard shortcuts (`useInboxShortcuts`): `/` focuses the search, `j`, `k` and the arrows move between the visible conversations and `Escape` goes back to the list. Long lists render sixty rows at a time (`useRenderWindow`) and load more when the sentinel button scrolls into view. The search text of the inbox and leads is kept in the URL as `q` (`useUrlQuery`). `queryCache` keeps the previous reference when a poll returns the same data, so unchanged polls do not re-render. The agent playground posts a standard AG-UI `RunAgentInput` and reads the JSON event stream with `data/agui.ts`, there is no AG-UI client dependency.

## Social login

Login and register offer "Continuar con Google" and "Continuar con Facebook" next to the email and password form, which stays as it was. The buttons use the Auth0 React SDK (`context/SocialAuthProvider.tsx`, `hooks/useSocialLogin.ts`) and only appear when `VITE_AUTH0_DOMAIN` and `VITE_AUTH0_CLIENT_ID` are set. The SDK ships in its own chunk (`context/Auth0Boundary.tsx`) that `SocialAuthProvider` mounts the first time the visitor reaches login, register, the invitation or the social callback, so the landing and the app never download it. The SDK never owns the session: it sends the visitor to Auth0, `/social/callback` (`pages/SocialCallback`) completes the redirect by hand, takes the ID token and posts it to `POST /auth/social`, and the API answers with the same `httpOnly` cookie as the password login. The SDK keeps nothing after that (`logout({ openUrl: false })`). Providers live in `util/social.ts`. Auth0 must list `<origin>/social/callback` as a callback URL. The e2e specs answer for Auth0 with `routeAuth0` in `e2e/support.ts`.

## Payments

Billing, invitations, referrals and the legal pages are built behind the flags core sends in `GET /auth/me`. `toAuthUser` keeps `features`, `access`, `isReseller` and `pendingLegal`, and anything missing or unexpected reads as off, with `access` as `FULL`. `useAuth()` exposes the same four values. `FeatureRoute` sends `/app/billing` and `/app/reseller` to `/` when their flag is off, and the account menu links Facturación with `features.billing`, Revendedor with `isReseller` and the consumer pages with `features.legal`. The contract lives in `boxlead-core/payments-plan/contracts/api-customer.md` and the types in `api/types.ts`. `api/errors.ts` reads the stable `code` and the `fields` of an error.

`/register` loads `GET /billing/plans`, `GET /invitations/current` and `GET /legal/documents` together and shows the loader until they answer or 5 seconds pass (`data/plans.ts`). Any answer but a 200 from the plans leaves the sign up as it was. With plans the visitor picks Starter or Business in `PlanPicker`, which leads with today's charge in pesos, the price without national taxes under its legend and the dollar reference (`util/planPrice.ts`). Enterprise only links to a conversation. The Beta is enabled only when the invitation answers, and then its email fills the form and cannot be changed. `?plan=` preselects a plan. The chosen plan travels only in the destination, `/app/billing?checkout=STARTER` or `BUSINESS` for a paid plan and `next` otherwise, always through `safeAppPath`. When the legal documents answer, a checkbox sends the terms and privacy versions as `acceptedLegal` in the sign up, and for Google or Facebook inside `appState` next to `next`, which `SocialCallback` passes on to `POST /auth/social`. Nothing about the plan goes to browser storage. Core answers the sign up and the social login before it accepts the invitation, so `AuthProvider` asks `GET /auth/me` again after both and only then navigates, keeping the first answer if that call fails.

The mock API answers every endpoint of that contract from `e2e/mock-api/billing.ts`. The scenarios `billing-none`, `billing-demo`, `billing-active`, `billing-past-due`, `billing-suspended`, `billing-checkout-pending`, `billing-checkout-rejected`, `billing-downgrade-pending`, `billing-invited` and `reseller` turn billing and legal on and give the agents page two enabled agents. Every other scenario keeps the flags off and the new endpoints answer 404. `resetApi(scenario, now, { pendingLegal, entitlementsUnavailable })` adds pending legal versions or makes the agent answer 503, and `settleCheckout(status)` decides the open checkout as the Mercado Pago return would. The checkout URL always points to `www.mercadopago.com.ar`, so specs intercept it with `page.route`. Invitation tokens live in `INVITATION_TOKENS` and `billing-invited` behaves as if the invitation cookie of another email were already set. A social login with the demo user's email answers 409 `ACCOUNT_EXISTS_WITH_PASSWORD`, as core does for an account with a password. Paid plans carry a USD `price`, the ARS `chargeToday` and a fixed `fxRate`, and `ENTERPRISE` is `contactOnly` with no price. Prices, rates and limits in the mock are made up for tests and are not the real catalog.

With `features.billing` on, `Layout` shows `PlanBanner` from `GET /billing/summary` (`usePlan`). It covers suspended, paused, no plan, past due with the Mercado Pago link to change the payment method, replies used up and a Demo that ends within a week (`planNotice.ts`). Any 402 with `PLAN_REQUIRED` or `PLAN_LIMIT_REACHED`, from core or the agent, gets a Spanish message in `api/client.ts`, refreshes the summary and adds a dismissable notice with a link to billing (`data/planErrors.ts`). Without a plan the playground and the composer say why they are off and creating or enabling an agent is disabled, and agents with `overPlanLimit` are marked. Metrics only offer a period of P days if 2P fit in `METRICS_HISTORY_DAYS` and skip the forecast with less than 84 days. When `GET /invitations/current` answers and the account has no Demo, a notice offers `POST /invitations/accept` and shows its error. A non empty `pendingLegal` opens `LegalAcceptanceDialog`, which only closes after `POST /legal/acceptances` or logging out.

`/invitacion` reads the token from the fragment, removes it from the URL with `history.replaceState`, keeps it only in memory and sends it to `POST /invitations/preview`. Without a session it offers `/register?plan=DEMO` or `/login`, and with one it accepts on purpose through `POST /invitations/accept`. `resetApi(scenario, now, { agentReplies })` sets the replies used in the period.

## Legal and consumer

The landing shows the Botón de arrepentimiento and the Botón de baja de servicio in the header and the footer on first access, without login and without calling the API (Disposición 954/2025). `/arrepentimiento` and `/baja` post `POST /consumer-requests` with the kind, the email and an optional detail of up to 500 characters and show the code. If the API fails or answers 404 they point to the support email with a prefilled subject. The footer and the Spanish legal pages show the provider block from `util/company.ts`. CUIT, address and support hours stay empty until Matías confirms them and `ProviderDetails` leaves out every empty field. The ARCA Data Fiscal badge appears in the footer only when `DATA_FISCAL_URL` and `DATA_FISCAL_IMAGE` are set, with the image served from `public/`. `/contratos` publishes the adhesion contract and is linked from the landing with the name that Resolución 271/2020 asks for. The texts of `/terminos`, `/privacidad` and `/contratos` are drafts for the lawyer, share their clauses through `pages/Legal/clauses` and show the version from `pages/Legal/legalVersion.ts`, which has to match the one core publishes.

## Billing

`/app/billing` (`pages/Billing`) shows the current plan with its usage, the plans of `GET /billing/plans`, the payments and the billing profile. Prices only come from the API and go through `util/planPrice.ts`, which puts `chargeToday` in pesos first with the day of `fxRate`, then `priceWithoutNationalTaxes` in smaller type under the PRECIO SIN IMPUESTOS NACIONALES legend, and the dollar price last as a reference. Enterprise is `contactOnly` and links to the support email instead of a purchase. The register sends new customers to `/app/billing?checkout=STARTER` or `BUSINESS`, which opens the purchase right away and asks for the billing profile first when it is missing.

Before paying, the purchase dialog shows the provider, the final price with VAT, the monthly renewal, how to cancel and the 10 day withdrawal right. It asks for the Mercado Pago email, prefilled with the BoxLead one, and shows the Mercado Pago banner from `public/mercadopago` with a link to their terms. The checkbox sends the terms, privacy and adhesion contract versions of `GET /legal/documents` as `acceptedLegal`, or nothing while that endpoint answers 404. The app only leaves for a `checkoutUrl` on `https://www.mercadopago.com.ar` (`isCheckoutUrl` in `util/checkout.ts`) and loads no Mercado Pago script, so the CSP stays the same.

`/app/billing/return` ignores its query and asks `GET /billing/summary` every 3 seconds for up to 60, so approved, pending and rejected always come from the server. Plan changes, undoing a pending downgrade and cancelling go through `ConfirmDialog` and keep the summary core returns. The CUIT is checked with its check digit before saving, and the 400 `fields` of core mark the same inputs. `e2e/billing.spec.ts` intercepts the Mercado Pago page with `page.route` and settles the payment with `settleCheckout`.

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
- UI copy is in Spanish. Legal texts are written in Spanish, which prevails, and the English pages are translations that say so.
- Load data with `useApiQuery` (shared cache, `refreshInterval` polls only while the tab is visible); mutations call `api` and then `invalidateQueries` or `setQueryData`.
- Every page sets its tab title with `useDocumentTitle`.
- Styles used by more than one page belong in `index.css` or a shared component, never in a page stylesheet (pages are code-split).
- Every screen needs loading, empty and error states, and must work from 320px wide.
- Animations are CSS, except number tweens with `useAnimatedNumber`, and all of them respect `prefers-reduced-motion`.

## Landing

- Lives in `src/landing/`. Dark by default; `html[data-theme="light"] .landing` in `LandingPage.css` overrides the `--landing-*` tokens, so components must use tokens (or `color-mix` on them) and never hard-coded colors.
- `[data-reveal]` elements are revealed by the observer in `LandingPage.tsx`; scroll-driven effects sit behind `@supports (animation-timeline: view())`.
- Keep the legal entity, the legal page links, the support email and the provider block in the footer (required for Meta app review and consumer law), and the withdrawal and cancellation buttons in the header and the footer.
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
- Response headers that a `<meta>` tag cannot set (HSTS, `frame-ancestors`, COOP, CORP, `Permissions-Policy`) come from the nginx image (`docker/security-headers.conf`, included in every location) and, in production, from the CloudFront response headers policy in `terraform/cloudfront.tf`. Change both together and keep the values identical.
- The CI and deploy workflows pin every action to a commit SHA with the tag in a comment. Bump the SHA and the comment together.

## Safety

Do not modify without explicit approval: `terraform/`, `.github/workflows/`, `.env.example`, or the behavior of `ProtectedRoute.tsx`.

Run `npm run lint`, `npm run build`, `npm test` and `npm run test:e2e` before considering work complete. New behaviour gets unit tests next to the code (`*.test.ts(x)`) and an end-to-end spec in `e2e/`, with the mock API extended to match the backend contract.

### End-to-end isolation

Playwright runs `E2E_WORKERS` workers (4 locally, 2 in CI, `e2e/ports.ts`). The mock API keeps its state in memory, so each worker gets its own instance on `8090 + parallelIndex`, and the app always talks to `8090`: the `test` exported from `e2e/support.ts` rewrites those requests to the worker's instance. Import `test` and `expect` from `./support.ts`, never from `@playwright/test`, and use `mockApiUrl()` for direct calls. `login()` signs in through the API and skips the form; tests of the form itself fill it in by hand. Playwright needs Node 24 (`.ts` mock server) and runs in `test-results/`, so do not start two runs at once.

### Demo video

The `showcase` scenario of the mock API is a store with about 800 leads across the four channels, three agents with drafts, handoffs and activity, and six fixed conversations at the top of the inbox that the tour uses. `npm run demo:video` records the tour in three chapters (agents, inbox, metrics) plus leads and connections, with a visible cursor, chapter cards and a closing card, in the dark theme, and writes `demo-video/boxlead-demo.mp4` in 1440p. The camera never zooms. A soft spotlight marks what each caption talks about. Frames are captured at twice a 1280 by 720 viewport through the DevTools screencast and the captions are laid over them with ffmpeg in a single pass. Start `npm run mock-api` and `npm run dev:mock` first and set `FFMPEG` to a full ffmpeg build. `DEMO_APP_URL`, `DEMO_API_URL` and `DEMO_SPEED` change the defaults, and `--encode-only` rebuilds the video from the last recording. Everything in it is demo data, so the closing card says so. The landing shows a lighter 1080p copy with its poster from `public/demo`, so a new take means replacing both files and the duration in `DemoVideo.tsx`. `npm run demo:promo` makes the 45 second vertical ad for social networks from the same servers and scenario. It renders a stage that holds the mobile app in a framed iframe, drives every animation from the frame time so the cut is exact and the machine load does not matter, captures each frame as PNG and writes the 9 by 16 and 1 by 1 videos from their own layouts, a poster and one still per scene in `promo-video`. The vertical one shows the whole mobile screen and the square one frames each plane closer. `PROMO_TIMES=1.5,12` renders only those seconds to check a scene, `PROMO_FORMATS=vertical` records one layout, and `PROMO_FORCE=1` skips the load check.
