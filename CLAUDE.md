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
```

### Key Files
- `src/App.tsx` — All route definitions
- `src/main.tsx` — React root (BrowserRouter > AuthProvider > App)
- `src/context/AuthContext.tsx` — JWT auth state management
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

### Auth Flow
1. JWT stored in localStorage (`signal_token`, `signal_user`)
2. `ProtectedRoute` checks token → redirects to `/login` if missing
3. `api/client.ts` attaches `Authorization: Bearer` header automatically
4. 401 response → `clearAuthAndGoLogin()` → hard redirect to `/login`
5. Post-login → navigate to `/app/inbox`
