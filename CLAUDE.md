# CLAUDE.md — BoxLead Frontend Agent Rules

## Critical Safety Constraints

1. **NEVER** modify `terraform/`, `.github/workflows/`, or `ProtectedRoute.tsx` behavior without explicit user approval.
2. **NEVER** remove or weaken the auth guard. Unauthenticated users must not access `/app/*` routes.
3. **NEVER** use `any` in TypeScript. Use `unknown` + type narrowing.
4. **NEVER** use inline styles. Use CSS classes with custom properties.
5. **NEVER** install CSS frameworks (Tailwind, styled-components, etc.). This project uses vanilla CSS.
6. **ALWAYS** run `npm run lint`, `npm run build`, `npm test`, `npm run test:dist` and `npm run test:e2e` before considering work complete.
7. **NEVER** branch on a platform id in pages or components; add the difference to `src/platforms/`.
8. **NEVER** touch `window`, `document` or storage during render in a component of a public page. They are prerendered on the server and hydrated.

## Quick Reference

### Commands
```bash
npm run dev        # Dev server at localhost:5173
npm run dev:mock   # Dev server against the mock API (run `npm run mock-api` first)
npm run dev:admin  # Backoffice dev server at localhost:5175, see Backoffice in AGENTS.md
npm run build      # TypeScript check + production build + prerender of the public pages, sitemap, robots and llms
npm run lint       # ESLint
npm test           # Vitest unit tests
npm run test:dist  # Checks dist/ over vite preview: titles, canonical, JSON-LD, sitemap, 404 and redirects
npm run test:e2e   # Playwright against the mock API, desktop and 320px
npm run preview    # Serve dist/ locally with the same clean URLs and 404 as production
npm run seo:images # Regenerate the social cards, icons and favicon.ico in public/
docker compose up --build   # Production image at localhost:3000
```

### Key Files
- `src/App.tsx` — All route definitions
- `src/main.tsx` — Hydrates the prerendered markup or creates the root (BrowserRouter > AppProviders)
- `src/seo/pages.ts` — Table of public pages: title, description, index, social card, hreflang, JSON-LD. `RouteMeta.tsx` renders it
- `src/landing/editorial.ts` — Channel and agency pages rendered by `landing/pages/EditorialPage.tsx`, their copy lives in `src/i18n/messages/*/channels.json`
- `src/i18n/` — i18next setup. Messages per language and area in `messages/<lang>/<area>.json`, `common`, `landing`, `channels`, `seo` and `auth` are bundled and the rest load on demand. `paths.ts` maps a path to its English version under `/en`, `LanguageSync` sets the language from the route or, in the app, from the preference. `messages.test.ts` fails when a language misses a key and the `i18n/no-literal-text` lint rule flags visible text written in JSX outside `I18N_PENDING`
- `scripts/prerender.ts` — Build step that writes one HTML per public page, `404.html`, `app.html`, `sitemap.xml`, `robots.txt` and `llms.txt`
- `src/analytics/` — Consent banner and GA4 loader, only with `VITE_GA_MEASUREMENT_ID` and only outside `/app`
- `src/context/AuthContext.tsx` — `AuthProvider` (session state from `/auth/me`); `src/context/auth.ts` — `useAuth`
- `src/hooks/` — `useApiQuery` (cached data loading), `useConnectPlatform`, `useDocumentTitle`
- `src/data/queryCache.ts` — shared request cache, invalidation and optimistic updates
- `src/platforms/` — per-channel definitions and registry
- `src/data/metrics.ts` — metrics query keys and the settings mutation (data comes from `/metrics`)
- `e2e/mock-api/` — mock backend used by Playwright and `npm run dev:mock`
- `src/api/client.ts` — HTTP client with auto-auth headers
- `src/api/types.ts` — All API type definitions, payments included
- `e2e/mock-api/billing.ts` — Payments mock and its `billing-*` and `reseller` scenarios
- `src/components/PlanBanner/` — Plan notices in `Layout`, fed by `usePlan` and the 402 errors of `api/client.ts`
- `src/components/Notifications/` and `src/components/NotificationSettings/` — Notice watcher in `Layout` and the preferences section, behind `features.notifications`
- `src/pages/Billing/` — Billing page, purchase and return, with prices formatted by `src/util/planPrice.ts`
- `src/index.css` — Global design tokens (`--signal-*`)
- `src/landing/` — Public landing page (isolated from app). Animations are CSS, and JS only passes the pointer position as CSS variables to elements with `data-glow`
- `src/util/company.ts` — Catvin SRL details for the provider block and the Data Fiscal badge, empty fields stay hidden
- `src/landing/flags.ts` — `BILLING_ENABLED` (plans section) and `REFERRALS_ENABLED` (`?ref=` capture in `util/referral.ts`), both `false` until payments go live

### Route Structure
```
/                 → Public landing page
/whatsapp, /instagram, /messenger, /mercadolibre, /agencias → Editorial pages, prerendered
/en, /en/whatsapp, /en/instagram, /en/messenger, /en/mercadolibre, /en/agencias → English versions, prerendered with hreflang both ways
/login, /register → Auth
/terminos, /privacidad, /contratos → Legal texts in Spanish, the version that prevails
/terms-of-service, /privacy-policy, /data-deletion → English translations and data deletion
/arrepentimiento, /baja → Withdrawal and cancellation requests without login
/invitacion       → Demo invitation, token in the fragment and only in memory
/app/*            → Protected app (inbox, leads, metrics, categories, connections)
/app/billing, /app/billing/return, /app/reseller → Only when /auth/me enables them (FeatureRoute)
```

### Patterns
- Named exports (except `App`)
- `function` keyword for components (not arrow)
- Co-located CSS files per component
- `--signal-*` tokens for app UI, `--landing-*` for landing page
- `type` keyword for TypeScript type aliases
- Type-only imports: `import type { X } from '...'`
- Public pages take their title from `src/seo/pages.ts`, app pages use `useDocumentTitle`
- No comments in code; UI copy comes from `src/i18n/messages` in Spanish and English, read with `useTranslation`, legal texts stay in Spanish with English translations that say Spanish prevails
- Dates, numbers and money use `intlLocale()` from `src/i18n/locale.ts`, never a fixed locale

### Auth Flow
1. The session is an `httpOnly` cookie set by the API; the frontend never sees the token
2. Nothing is kept in `localStorage`; the user lives in memory
3. On `/app`, `/login`, `/register` and `/invitacion`, `AuthProvider` calls `GET /auth/me` and shows a loader until it answers; then `ProtectedRoute` redirects to `/login?next=<path>` if there is no user
4. `api/client.ts` sends `credentials: "include"` and `X-Requested-With: boxlead-web` on every request
5. 401 response → `clearAuthAndGoLogin()` → hard redirect to `/login?next=<path>`
6. Post-login → navigate to the safe `next` path or `/app/inbox`; logout calls `POST /auth/logout` and clears the query cache
7. Sign up with plans → a paid plan goes to `/app/billing?checkout=<plan>` and the Beta to `next` (`data/plans.ts`). Social login carries the accepted legal versions in `appState`, and both sign up paths read `/auth/me` again before navigating
