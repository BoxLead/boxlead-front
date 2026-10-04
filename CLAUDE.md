# CLAUDE.md — BoxLead Frontend Agent Rules

## Critical Safety Constraints

1. **NEVER** modify `terraform/`, `.github/workflows/`, or `ProtectedRoute.tsx` behavior without explicit user approval.
2. **NEVER** remove or weaken the auth guard. Unauthenticated users must not access `/app/*` routes.
3. **NEVER** use `any` in TypeScript. Use `unknown` + type narrowing.
4. **NEVER** use inline styles. Use CSS classes with custom properties.
5. **NEVER** install CSS frameworks (Tailwind, styled-components, etc.). This project uses vanilla CSS.
6. **ALWAYS** run `npm run lint`, `npm run build`, `npm test` and `npm run test:e2e` before considering work complete.
7. **NEVER** branch on a platform id in pages or components; add the difference to `src/platforms/`.

## Quick Reference

### Commands
```bash
npm run dev        # Dev server at localhost:5173
npm run dev:mock   # Dev server against the mock API (run `npm run mock-api` first)
npm run build      # TypeScript check + production build
npm run lint       # ESLint
npm test           # Vitest unit tests
npm run test:e2e   # Playwright against the mock API, desktop and 320px
npm run preview    # Serve dist/ locally
docker compose up --build   # Production image at localhost:3000
```

### Key Files
- `src/App.tsx` — All route definitions
- `src/main.tsx` — React root (BrowserRouter > AuthProvider > ToastProvider > App)
- `src/context/AuthContext.tsx` — `AuthProvider` (session state from `/auth/me`); `src/context/auth.ts` — `useAuth`
- `src/hooks/` — `useApiQuery` (cached data loading), `useConnectPlatform`, `useDocumentTitle`
- `src/data/queryCache.ts` — shared request cache, invalidation and optimistic updates
- `src/platforms/` — per-channel definitions and registry
- `e2e/mock-api/` — mock backend used by Playwright and `npm run dev:mock`
- `src/api/client.ts` — HTTP client with auto-auth headers
- `src/api/types.ts` — All API type definitions
- `src/index.css` — Global design tokens (`--signal-*`)
- `src/landing/` — Public landing page (isolated from app, CSS-only animations)

### Route Structure
```
/                 → Public landing page
/login, /register → Auth
/privacy-policy, /terms-of-service, /data-deletion → Legal
/app/*            → Protected app (inbox, leads, connections)
```

### Patterns
- Named exports (except `App`)
- `function` keyword for components (not arrow)
- Co-located CSS files per component
- `--signal-*` tokens for app UI, `--landing-*` for landing page
- `type` keyword for TypeScript type aliases
- Type-only imports: `import type { X } from '...'`
- No comments in code; UI copy in Spanish (legal pages in English)

### Auth Flow
1. The session is an `httpOnly` cookie set by the API; the frontend never sees the token
2. Nothing is kept in `localStorage`; the user lives in memory
3. On `/app`, `/login` and `/register`, `AuthProvider` calls `GET /auth/me` and shows a loader until it answers; then `ProtectedRoute` redirects to `/login?next=<path>` if there is no user
4. `api/client.ts` sends `credentials: "include"` and `X-Requested-With: boxlead-web` on every request
5. 401 response → `clearAuthAndGoLogin()` → hard redirect to `/login?next=<path>`
6. Post-login → navigate to the safe `next` path or `/app/inbox`; logout calls `POST /auth/logout` and clears the query cache
