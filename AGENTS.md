# BoxLead Frontend

SPA for BoxLead: a public landing page plus the app (inbox, leads, connections). Deployed as static assets to S3 + CloudFront.

**Stack:** Vite 8, React 19, TypeScript 5.9 (strict), react-router-dom 7, vanilla CSS, ESLint 9.

## Structure

```
index.html            # Entry HTML, SEO metadata
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

## Safety

Do not modify without explicit approval: `terraform/`, `.github/workflows/`, `.env.example`, or the behavior of `ProtectedRoute.tsx`.

Run `npm run lint` and `npm run build` before considering work complete.
