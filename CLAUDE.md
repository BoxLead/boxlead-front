# CLAUDE.md — BoxLead Frontend Agent Rules

## Critical Safety Constraints

1. **NEVER** modify `terraform/`, `.github/workflows/`, or `ProtectedRoute.tsx` behavior without explicit user approval.
2. **NEVER** remove or weaken the auth guard. Unauthenticated users must not access `/app/*` routes.
3. **NEVER** use `any` in TypeScript. Use `unknown` + type narrowing.
4. **NEVER** use inline styles. Use CSS classes with custom properties.
5. **NEVER** install CSS frameworks (Tailwind, styled-components, etc.). This project uses vanilla CSS.
6. **ALWAYS** run `npm run lint` and `npm run build` before considering work complete.

## Quick Reference

### Commands
```bash
npm run dev       # Dev server at localhost:5173
npm run build     # TypeScript check + production build
npm run lint      # ESLint
npm run preview   # Serve dist/ locally
docker compose up --build   # Production image at localhost:3000
```

### Key Files
- `src/App.tsx` — All route definitions
- `src/main.tsx` — React root (BrowserRouter > AuthProvider > App)
- `src/context/AuthContext.tsx` — `AuthProvider` (JWT auth state); `src/context/auth.ts` — `useAuth`
- `src/hooks/` — `useApiQuery` (data loading), `useDocumentTitle`
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
2. `localStorage` keeps only `signal_user` (`userId`, `email`) as a display hint
3. `ProtectedRoute` checks the user → redirects to `/login` if missing; `AuthProvider` confirms it with `GET /auth/me`
4. `api/client.ts` sends `credentials: "include"` and `X-Requested-With: boxlead-web` on every request
5. 401 response → `clearAuthAndGoLogin()` → hard redirect to `/login`
6. Post-login → navigate to `/app/inbox`; logout calls `POST /auth/logout`
