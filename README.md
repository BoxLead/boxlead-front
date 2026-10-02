# BoxLead (frontend)

React + TypeScript SPA for BoxLead: the public landing page and the app (inbox, leads, connections).

## Development

Start the API on `http://localhost:8080`, then:

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` to the API.

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Dev server                   |
| `npm run build`   | Typecheck + production build |
| `npm run lint`    | ESLint                       |
| `npm run preview` | Serve `dist/` locally        |

## Production API URL

Set `VITE_API_BASE_URL` to the deployed API origin (no trailing slash). See [.env.example](.env.example).

## OAuth

Register the redirect URL of each platform as `{origin}/app/oauth/callback/{PLATFORM}`, for example `http://localhost:5173/app/oauth/callback/META`.
