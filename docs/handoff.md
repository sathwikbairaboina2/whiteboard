## 2026-10-04, Claude (Sonnet builder), branch main

**What changed:** Built whiteboard v0.1 from the plan, tasks 1 to 25: Yjs command layer and sanitizer, IndexedDB persistence, y-webrtc sync with a self-hosted signaling server, rbush-culled Canvas2D renderer, tools, React chrome, PWA, Playwright e2e (draw, pwa, sync, offline), benchmarks, Docker images, CI, demo GIF, README and DEVDOCS. One commit per task; see `.superpowers/sdd/2026-10-04-whiteboard/progress.md` for per-task results and the one Ruling.

**What is left:** Opus review of the gates. Out of scope for v0.1: text, arrow and eraser tools, awareness cursors, export and import, dirty rects, resize and rotate handles, npm package for `crdt-core`, TURN, public deploy. The whole-board view of 10,000 shapes measured a paint p95 of 13.6 ms on the final bench run (21.7 ms on an earlier busier run); the pan benchmark headline is 3.2 ms p95 on that run, and the machine was shared, so numbers are noisy.

**How to verify (results on 2026-10-04):**

| Command | Result |
|---|---|
| `pnpm typecheck` | exit 0 |
| `pnpm test` | 19 files, 60 tests passed, 0 skipped |
| `pnpm build` | exit 0, `dist/sw.js` and `dist/manifest.webmanifest` exist |
| `pnpm e2e` | 7 passed (draw x2, lastroom, merge, offline, pwa, sync) |
| `pnpm bench` | wrote `bench/results.json`; HEADLINE 3.2 ms p95 paint; convergence true |
| `docker compose up -d --build`, curl 5413 and 5414, `docker compose down` | 200, okay, no whiteboard-* container left |
| actionlint 1.7.12 via Docker (`MSYS_NO_PATHCONV=1` under Git Bash) | exit 0 |

## 2026-10-04, Claude (Opus lead, step 5: verify and docs), branch main

**What changed:** Confirmed both important review findings are fixed. (1) Offline merge is now real: `Session.disconnect()/reconnect()` closes the y-webrtc connection, exposed only with `?debug=1` or `?hook=1`. `e2e/merge.spec.ts` shows A stays at 2 shapes while B is disconnected, and both reach 3 after reconnect. The demo GIF uses the same hook. (2) The installed app no longer opens a blank board: `src/app/lastRoom.ts` remembers `{roomId,key}` in `localStorage` (`whiteboard:lastRoom`). It is covered by `tests/lastRoom.test.ts` and `e2e/lastroom.spec.ts`, and ADR 0005 notes it. Rewrote `docs/DEVDOCS.md` as a plain developer guide. Fixed the README pan frame-interval p95 (16.8 to 16.7 ms, to match `bench/results.json`).

**What is left:** Out of scope for v0.1: text, arrow and eraser tools, live cursors, export and import, dirty rects, resize and rotate handles, an npm package for `crdt-core`, TURN, a public deploy, and a multi-board picker. The whole-board 10k view has little paint headroom (13.6 ms p95). Nothing was pushed, and there is no remote.

**How to verify (run by Opus on 2026-10-04):**

| Command | Result |
|---|---|
| `pnpm typecheck` | exit 0 |
| `pnpm test` | 19 files, 60 tests passed |
| `pnpm build` | exit 0, PWA precache 15 entries, `dist/sw.js` written |
| `pnpm e2e` | 7 passed (draw x2, lastroom, merge, offline, pwa, sync) |
| `docker compose -p whiteboard-verify build`, then `docker compose up -d`, curl 5413 `/` and `/sw.js`, curl 5414, `docker compose down` | images built; 200, 200, `okay` 200; containers removed |
| `pnpm bench` | not re-run in this step; headline 3.2 ms p95 comes from the committed `bench/results.json` (2026-10-03T23:22:38Z) |
