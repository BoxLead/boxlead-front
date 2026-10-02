# BoxLead Frontend — System Software Design (SSD)

## 1. Project Overview

**BoxLead** is a SaaS web application that centralizes, manages, and automates lead management from multiple digital channels (WhatsApp, Instagram, Messenger, MercadoLibre, TikTok, LinkedIn, Google Ads). The frontend is a single-page application (SPA) deployed as static assets to AWS S3 + CloudFront.

### Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Build | Vite | 8.x |
| UI | React | 19.x |
| Language | TypeScript | 5.9 (strict mode) |
| Routing | react-router-dom | 7.x |
| Animations | CSS (transitions, keyframes, scroll-driven) | — |
| Linting | ESLint | 9.x |
| Deployment | S3 + CloudFront via Terraform | — |
| CI/CD | GitHub Actions | — |

---

## 2. Architecture

```
signal-front/
├── index.html                 # Vite entry HTML
├── vite.config.ts             # Vite config (React plugin + dev proxy)
├── tsconfig.json              # TypeScript project references
├── tsconfig.app.json          # App compiler options (strict: true)
├── eslint.config.js           # ESLint flat config
├── package.json
│
├── public/                    # Static assets (served as-is)
│   ├── favicon.svg
│   ├── og-image.png
│   ├── robots.txt
│   └── sitemap.xml
│
├── src/
│   ├── main.tsx               # React root: BrowserRouter > AuthProvider > App
│   ├── App.tsx                # Route definitions
│   ├── index.css              # Global CSS variables (--signal-*) and resets
│   ├── vite-env.d.ts          # Vite client types
│   │
│   ├── api/                   # HTTP client layer
│   │   ├── client.ts          # Centralized fetch wrapper, auth persistence
│   │   └── types.ts           # API request/response type definitions
│   │
│   ├── context/               # React context providers
│   │   └── AuthContext.tsx     # JWT auth state, login/register/logout
│   │
│   ├── components/            # Shared app-level components
│   │   ├── ProtectedRoute.tsx  # Auth guard (redirects to /login)
│   │   ├── Layout/            # App shell (sidebar + outlet)
│   │   └── Sidebar/           # Navigation sidebar
│   │
│   ├── pages/                 # Route-level page components
│   │   ├── Login/
│   │   ├── Register/
│   │   ├── Inbox/
│   │   ├── Leads/
│   │   ├── Connections/
│   │   ├── OAuthCallback/
│   │   └── Legal/
│   │
│   ├── landing/               # Public landing page (no auth required)
│   │   ├── LandingPage.tsx     # Page orchestrator
│   │   ├── LandingPage.css     # Landing-specific design tokens
│   │   ├── icons/              # PlatformIcons.tsx (brand logos), UiIcons.tsx (line icons)
│   │   └── components/         # Landing section components
│   │       ├── Logo.tsx / Logo.css
│   │       ├── Header.tsx / Header.css
│   │       ├── HeroSection.tsx / HeroSection.css
│   │       ├── AgentDemo.tsx / AgentDemo.css
│   │       ├── IntegrationsMarquee.tsx / IntegrationsMarquee.css
│   │       ├── ProductOverview.tsx / ProductOverview.css
│   │       ├── HowItWorks.tsx / HowItWorks.css
│   │       ├── AgentFlow.tsx / AgentFlow.css
│   │       ├── FaqSection.tsx / FaqSection.css
│   │       ├── CtaSection.tsx / CtaSection.css
│   │       └── Footer.tsx / Footer.css
│   │
│   ├── util/                  # Shared utilities
│   │   ├── format.ts
│   │   └── facebook-sdk.ts
│   │
│   └── assets/                # Bundled assets (images, SVGs)
│
└── terraform/                 # Infrastructure as Code (DO NOT MODIFY without approval)
    ├── main.tf
    ├── s3.tf
    ├── cloudfront.tf
    ├── acm.tf
    ├── iam.tf
    └── ...
```

---

## 3. Code Conventions

### 3.1 TypeScript

- **Strict mode is mandatory.** The project uses `"strict": true` with `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch`.
- **Never use `any`.** Use `unknown` and narrow with type guards.
- **Use `type` for type aliases** (not `interface` unless extending).
- **Named exports only.** Default exports are only used for `App` (Vite convention).
- **Use `type` keyword for type-only imports:** `import type { Foo } from './types'`

### 3.2 React Components

- **Functional components only** using the `function` keyword (not arrow functions for components).
- **One component per file.** File name matches component name (PascalCase).
- **Co-located CSS.** Each component has a sibling `.css` file with the same name.
- **No inline styles.** Use CSS classes. Use CSS custom properties for theming.
- **Props types are defined inline** for simple components or as named `type` exports for complex ones.

### 3.3 CSS

- **CSS custom properties** for all design tokens, prefixed with `--signal-` for app UI and `--landing-` for landing page.
- **No CSS frameworks.** Vanilla CSS only (no Tailwind, no CSS-in-JS).
- **BEM-like naming:** `.component-element` (e.g., `.sidebar-link`, `.hero-title`).
- **Responsive design:** Mobile-first with `min-width` media queries.

### 3.4 File Organization

- **Page components** go in `src/pages/{PageName}/{PageName}.tsx`.
- **Landing components** go in `src/landing/components/{Component}.tsx`.
- **Shared components** go in `src/components/{Component}/{Component}.tsx`.
- **API types** go in `src/api/types.ts`.
- **Utilities** go in `src/util/`.

---

## 4. Routing Architecture

```
/                        → LandingPage (public)
/login                   → Login (public)
/register                → Register (public)
/privacy-policy          → PrivacyPolicy (public)
/terms-of-service        → TermsOfService (public)
/data-deletion           → DataDeletion (public)
/app                     → ProtectedRoute → Layout
  /app/inbox             → Inbox
  /app/leads             → Leads
  /app/connections       → Connections
  /app/oauth/callback/:p → OAuthCallback
*                        → Redirect to /
```

### Auth Flow

1. Unauthenticated users visiting `/app/*` are redirected to `/login` by `ProtectedRoute`.
2. On successful login/register, users are navigated to `/app/inbox`.
3. On logout, users are navigated to `/login`.
4. On 401 API response, `clearAuthAndGoLogin()` hard-redirects to `/login`.
5. The landing page at `/` is always public.

---

## 5. State Management

- **Auth state:** `AuthContext` with JWT token and user info in React context + `localStorage`.
- **Page-level state:** `useState`/`useCallback`/`useMemo` inside page components.
- **No global state library.** Keep state minimal and colocated.

---

## 6. API Layer

- All HTTP calls go through `src/api/client.ts` using the `api` object.
- The `apiUrl()` function resolves paths: in dev, prefixes with `/api` (proxied by Vite); in prod, uses `VITE_API_BASE_URL`.
- API errors are thrown as `ApiError` instances with `status` and `body`.
- Auth tokens are automatically attached via `Authorization: Bearer` header.

---

## 7. Deployment & Safety Rules

> **CRITICAL: Never modify the following without explicit approval:**
> - `terraform/` — Infrastructure as Code
> - `.github/workflows/deploy.yml` — CI/CD pipeline
> - `.env.example` — Environment variable documentation
> - `ProtectedRoute.tsx` behavior — Auth guard logic

### Build & Deploy

```bash
npm run dev      # Local dev server (port 5173, proxies /api → localhost:8080)
npm run build    # TypeScript check + Vite production build → dist/
npm run lint     # ESLint check
npm run preview  # Serve dist/ locally
```

### Production

- Static files are deployed to S3 and served via CloudFront.
- CloudFront returns `index.html` for all 403/404 errors (SPA routing).
- `VITE_API_BASE_URL` is injected at build time from AWS SSM Parameter Store.

---

## 8. Landing Page Guidelines

- The landing page lives in `src/landing/` — completely isolated from the app UI.
- Uses its own CSS variables (`--landing-*`) to avoid conflicts with `--signal-*`.
- Animations are CSS only: `[data-reveal]` elements are revealed by the observer in `LandingPage.tsx`, plus scroll-driven effects behind `@supports (animation-timeline: view())`. No animation libraries.
- Must be fully responsive (375px → 1440px+).
- Dark theme only (no light/dark toggle on landing).
- All copy is in **Spanish** (target market: LATAM).
- Images should be SVGs or optimized assets — no external CDN dependencies.
