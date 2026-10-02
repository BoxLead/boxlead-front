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

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Dev server                   |
| `npm run build`   | Typecheck + production build |
| `npm run lint`    | ESLint                       |
| `npm run preview` | Serve `dist/` locally        |

## Docker

The image builds the app and serves it with nginx as a non-root user on port 8080.

```bash
docker compose up --build
```

The app is served on `http://localhost:3000`. Two variables can be set in the environment or in `.env`:

| Variable            | Default                 | Description                              |
| ------------------- | ----------------------- | ---------------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | API origin, baked into the bundle        |
| `WEB_PORT`          | `3000`                  | Host port                                |

`VITE_API_BASE_URL` is a build argument: changing it requires a rebuild, and the API must allow the app origin in CORS. Its origin is also added to the Content Security Policy that production builds inject into `index.html`.

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

## Deployment

Pushing to `master` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

1. Lints inside Docker (`lint` target).
2. Builds the image with `VITE_API_BASE_URL` read from SSM and smoke-tests it.
3. Exports the static files from the same build and syncs them to S3, then invalidates CloudFront.

Infrastructure lives in [terraform/](terraform/README.md).

## OAuth

Register the redirect URL of each platform as `{origin}/app/oauth/callback/{PLATFORM}`, for example `http://localhost:5173/app/oauth/callback/META`.
