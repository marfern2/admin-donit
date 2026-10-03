# Stage 1: Build
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build:image

# Stage 2: Serve
FROM nginx:stable-alpine AS serve

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/admin-donit/browser /usr/share/nginx/html
COPY --chmod=755 docker/40-generate-runtime-config.sh /docker-entrypoint.d/40-generate-runtime-config.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --spider -q http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
