# ADR 0007: Host Node for development, Docker for shipping

Date: 2026-10-04. Status: accepted.

## Context
The host has Node 24.18 and pnpm 9.12. Sibling projects build at the same time on other ports, and other sessions use Docker concurrently.

## Decision
- Dev, unit tests, e2e and bench run on the host with pnpm.
- Ports: dev 5410, dev signaling 5411, preview 5412, Docker app 5413, Docker signaling 5414, e2e signaling 5415. Vite always uses `--strictPort`.
- `Dockerfile` has two targets. `app`: a `node:24-alpine` stage builds with `VITE_SIGNALING_URLS=ws://localhost:5414`, then `nginx:1.29-alpine` serves `dist` on 5413. `signaling`: `node:24-alpine` runs `node server/signaling.ts` on 5414 (Node 24 strips TypeScript types natively).
- `docker-compose.yml` uses project name `whiteboard` and container names `whiteboard-app` and `whiteboard-signaling`.

## Consequences
- What I gave up: the design's "Node only in containers" setup. Tests depend on the host Node version, pinned by `.nvmrc` and `engines`; CI pins Node 24.
- What I gave up: no hosted demo URL in v0.1, because this session may not push or deploy.
