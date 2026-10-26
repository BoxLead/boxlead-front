# BoxLead (frontend)

React + TypeScript SPA for BoxLead: the public landing page and the app (inbox, leads, connections).

**Requirements:** Node 24 (see `.nvmrc`) or Docker.

## Development

Start the API on `http://localhost:8080`, then:

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` to the API.

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Dev server                                       |
| `npm run build`      | Typecheck + production build                     |
| `npm run lint`       | ESLint                                           |
| `npm test`           | Unit tests (Vitest)                              |
| `npm run test:e2e`   | End-to-end tests (Playwright, desktop and 320px) |
| `npm run test:dist`  | Checks the built site over the preview: titles, canonical, JSON-LD, sitemap, 404 and redirects |
| `npm run seo:images` | Regenerates the social cards, icons and favicon.ico in `public/` |
| `npm run mock-api`   | Mock API on port 8090 with demo data             |
| `npm run dev:mock`   | Dev server against the mock API                  |
| `npm run preview`    | Serve `dist/` locally with clean URLs and a real 404 |

The first run of the end-to-end suite needs a browser: `npx playwright install chromium`. The mock API signs in with any email and the password `demo1234`, and `POST /__reset` with `{"scenario":"empty"}` or `{"scenario":"meli-reconnect"}` switches its data. The `billing-*` and `reseller` scenarios turn on the payments endpoints, which answer 404 everywhere else.

## Docker

The image builds the app and serves it with nginx as a non-root user on port 8080.

```bash
docker compose up --build
```

The app is served on `http://localhost:3000`. These variables can be set in the environment or in `.env`:

| Variable            | Default                 | Description                              |
| ------------------- | ----------------------- | ---------------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | API origin, baked into the bundle        |
| `VITE_AGENT_API_BASE_URL` | `http://localhost:8000` | Agent API origin (agents page), baked into the bundle |
| `VITE_GA_MEASUREMENT_ID` | unset | Google Analytics 4 id. Unset ships no analytics. With a value the public pages ask for consent first and `/app` never loads it |
| `VITE_GOOGLE_SITE_VERIFICATION` | unset | Search Console token for a meta tag. The DNS record is preferred |
| `WEB_PORT`          | `3000`                  | Host port                                |

`VITE_API_BASE_URL` is a build argument: changing it requires a rebuild, and the API must allow the app origin in CORS. `VITE_AGENT_API_BASE_URL` works the same way for the agent service, which must also allow the app origin with credentials. Both origins are also added to the Content Security Policy that production builds inject into `index.html`.

Without Compose:

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.example.com -t boxlead-front .
docker run --rm -p 3000:8080 boxlead-front
```

Dockerfile targets:

| Target    | Purpose                                             |
| --------- | --------------------------------------------------- |
| `lint`    | Runs ESLint                                         |
| `export`  | Only the static files (`--output type=local,dest=dist`) |
| `runtime` | nginx image (default), health check on `/healthz`   |

## SEO

The public pages are prerendered during `npm run build`. Every route listed in `src/seo/pages.ts` becomes its own HTML file in `dist/` with its title, description, canonical, Open Graph tags, hreflang and JSON-LD already in the markup, next to `404.html`, `app.html` (the shell for `/app`), `sitemap.xml`, `robots.txt` and `llms.txt`. The browser hydrates that markup, so the page works without waiting for JavaScript and link previews show the right card.

To add a public page

1. Create the component and add its route in `src/App.tsx` with `lazyRoute` and `registerRoutePreload`.
2. Add the page to `src/seo/pages.ts` with a unique title and description, `index: true` if it should be found, and a `jsonLd` builder.
3. Add its entry modules to `ROUTE_ENTRIES` in `vite.config.ts` so the prerendered file links its stylesheet.
4. If the page deserves its own social card, add it to `CARDS` in `scripts/brandImages.ts`, run `npm run seo:images` and point `image` in the page table to it.
5. Run `npm run build && npm run test:dist`. The check fails on a missing title, a duplicate description, a second `h1`, invalid JSON-LD or a page missing from the sitemap.

Channel and agency pages are data in `src/landing/editorial.ts`. Keep their claims aligned with `src/platforms/` and never add figures, prices or testimonials.

URLs have one form, without trailing slash and without `.html`. `vite preview`, nginx and the CloudFront Function redirect the other forms with 301 and answer 404 for anything that does not exist.

## Deployment

Pushing to `master` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

1. Lints and runs the unit tests inside Docker (`test` target).
2. Records the last commit of every source file for the sitemap, builds the image with the `VITE_*` values read from SSM, verifies the generated site and smoke-tests the image, including the 404 status and a redirect.
3. Exports the static files from the same build, syncs them to S3 with `Cache-Control` per kind and invalidates CloudFront.

Infrastructure lives in [terraform/](terraform/README.md).

## OAuth

Register the redirect URL of each platform as `{origin}/app/oauth/callback/{PLATFORM}`, for example `http://localhost:5173/app/oauth/callback/META`.
