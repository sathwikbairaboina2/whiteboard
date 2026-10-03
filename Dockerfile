FROM node:24-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
ARG VITE_SIGNALING_URLS=ws://localhost:5414
ENV VITE_SIGNALING_URLS=$VITE_SIGNALING_URLS
COPY . .
RUN pnpm exec vite build

FROM nginx:1.29-alpine AS app
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 5413

FROM node:24-alpine AS signaling
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY server ./server
ENV PORT=5414
EXPOSE 5414
USER node
CMD ["node", "server/signaling.ts"]
