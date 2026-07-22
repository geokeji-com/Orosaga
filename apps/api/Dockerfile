FROM node:24.17.0-alpine3.23 AS build
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
COPY packages packages
COPY apps/api apps/api
RUN cd apps/api && DATABASE_URL=postgresql://build:build@localhost/build node ../../node_modules/prisma/build/index.js generate
RUN npm run build -w @orosaga/contracts && npm run build -w @orosaga/config && npm run build -w @orosaga/api

FROM node:24.17.0-alpine3.23
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api apps/api
COPY --from=build /app/packages/contracts/package.json packages/contracts/package.json
COPY --from=build /app/packages/contracts/dist packages/contracts/dist
COPY --from=build /app/packages/config/package.json packages/config/package.json
COPY --from=build /app/packages/config/dist packages/config/dist
USER node
CMD ["node", "apps/api/dist/main.js"]
