# syntax=docker/dockerfile:1

ARG NODE_VERSION=24
ARG NGINX_VERSION=stable

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM deps AS source
COPY . .

FROM source AS lint
RUN npm run lint

FROM lint AS test
RUN npm test

FROM source AS build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ARG VITE_AGENT_API_BASE_URL
ENV VITE_AGENT_API_BASE_URL=${VITE_AGENT_API_BASE_URL}
ARG VITE_AUTH0_DOMAIN
ENV VITE_AUTH0_DOMAIN=${VITE_AUTH0_DOMAIN}
ARG VITE_AUTH0_CLIENT_ID
ENV VITE_AUTH0_CLIENT_ID=${VITE_AUTH0_CLIENT_ID}
ARG VITE_GA_MEASUREMENT_ID
ENV VITE_GA_MEASUREMENT_ID=${VITE_GA_MEASUREMENT_ID}
ARG VITE_GOOGLE_SITE_VERIFICATION
ENV VITE_GOOGLE_SITE_VERIFICATION=${VITE_GOOGLE_SITE_VERIFICATION}
RUN npm run build && npm run test:dist

FROM scratch AS export
COPY --from=build /app/dist /

FROM source AS admin-build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build:admin

FROM scratch AS admin-export
COPY --from=admin-build /app/dist-admin /

FROM nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/conf.d/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
