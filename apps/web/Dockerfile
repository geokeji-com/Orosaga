ARG NODE_IMAGE=node:24.17.0-alpine3.23
ARG NGINX_IMAGE=nginx:1.28.3-alpine3.23
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/testing/package.json packages/testing/package.json
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/web apps/web
RUN npm run build -w @orosaga/contracts && npm run build -w @orosaga/web

FROM ${NGINX_IMAGE}
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
