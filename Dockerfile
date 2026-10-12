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
RUN npm run build

FROM scratch AS export
COPY --from=build /app/dist /

FROM nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
