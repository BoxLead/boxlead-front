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
├── index.css         # App design tokens (--signal-*)
├── api/              # HTTP client and API types
├── context/          # AuthContext (JWT)
├── components/       # ProtectedRoute, Layout, Sidebar
├── pages/            # Login, Register, Inbox, Leads, LeadDetail, Connections, OAuthCallback, Legal
├── landing/          # Public landing: LandingPage, components/, icons/
└── util/
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

## Conventions

- Never use `any`; use `unknown` and narrow.
- `type` aliases and `import type` for type-only imports.
- Named exports, except `App`.
- Components use the `function` keyword, one per file, with a co-located `.css` file.
- No inline styles and no CSS frameworks. Tokens: `--signal-*` for the app, `--landing-*` for the landing.
- All HTTP calls go through `src/api/client.ts`.

## Landing

- Lives in `src/landing/`, isolated from the app UI. Dark theme only, copy in Spanish.
- Animations are CSS only. `[data-reveal]` elements are revealed by the observer in `LandingPage.tsx`; scroll-driven effects sit behind `@supports (animation-timeline: view())`.
- Must work from 320px to desktop and respect `prefers-reduced-motion`.
- Keep the legal entity, the legal page links and the support email in the footer (required for Meta app review).

## Safety

Do not modify without explicit approval: `terraform/`, `.github/workflows/`, `.env.example`, or the behavior of `ProtectedRoute.tsx`.

Run `npm run lint` and `npm run build` before considering work complete.
