# syntax=docker/dockerfile:1

# ---------- build ----------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# npm ci needs both files and uses the lockfile exactly.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* at build time, so the API URL is a build argument
# rather than a runtime environment variable.
ARG VITE_GRAPHQL_URL=http://localhost:8001/graphql
ENV VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL
RUN npm run build

# ---------- runtime --------------------------------------------------------
# The built app is static files; nginx serves them. No Node in the runtime.
FROM nginx:1.30-alpine AS runtime

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# nginx:alpine ships an unprivileged "nginx" user; give it the paths it needs.
RUN touch /var/run/nginx.pid \
 && chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
