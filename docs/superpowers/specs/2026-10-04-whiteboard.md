# Whiteboard v0.1 spec (2026-10-04)

Source design: `taskarinchu/docs/devdocs/whiteboard.md`. Portfolio bar: `taskarinchu/docs/superpowers/specs/2026-10-03-project-shortlist.md`.
This spec narrows that design to a v0.1 that one builder can ship in about 25 tasks. Where this spec and the design disagree, this spec wins and the reason is a `Ruling:` line or an ADR.

## What v0.1 is

An offline-first whiteboard in the browser. Shapes live in a Yjs document. The app installs as a PWA, keeps working with no network, persists to IndexedDB, and syncs peer to peer over WebRTC. A tiny self-hosted signaling server only introduces peers. No server ever stores or sees board content.

The 30-second demo: open the room link in two browser windows, draw in one, it appears in the other. Turn one offline, keep drawing, turn it back on, both boards merge.

## Portfolio bar, mapped

| Bar | v0.1 answer |
|---|---|
| 30-second wow | Two-window sync demo, recorded by Playwright to `docs/media/demo.gif` (README top). |
| Measured headline number | p95 paint time per frame while panning a 10,000-shape board, from `bench/results.json` (Playwright + Chromium, CPU model printed). Second numbers: bytes per shape move, peer commit-to-remote-apply latency p50. |
| Something installable | The PWA (Chromium reports zero installability errors through CDP `Page.getInstallabilityErrors`, asserted in e2e) and a Docker image pair (`whiteboard-app`, `whiteboard-signaling`). |
| Senior proof | Mermaid architecture in DEVDOCS, ADRs 0001 to 0008 with "what I gave up", GitHub Actions CI (typecheck, unit + property tests, build, e2e), actionlint-clean. |

## Scope

In:
- Tools: select (V) with click, shift-click, marquee and drag-move; rectangle (R); ellipse (O); freehand (P). Delete or Backspace deletes the selection. Undo Ctrl+Z, redo Ctrl+Shift+Z or Ctrl+Y.
- Camera: wheel pans, Ctrl+wheel zooms at the cursor (0.1x to 8x), Space+drag or middle-drag pans.
- Stroke color swatches (5 colors) and fill on/off for new shapes. `setStyle` applies to the selection.
- Rooms in the URL fragment: `#room=<12 chars>&key=<22 chars>`. A fresh visit with no fragment creates a room and rewrites the URL. Copy-link button.
- Top bar: room name, copy link, peer count, online/offline badge, install button (only when `beforeinstallprompt` fired).
- Debug overlay at `?debug=1`: shape count, invalid count, drawn count, last paint ms.
- `?signaling=<ws url>` and `?ice=none` query overrides (used by e2e for determinism).
- Self-hosted signaling server (`server/signaling.ts`, y-webrtc protocol, MIT attribution).
- Sanitizer that repairs over-limit remote data (design invariant 5).
- Undo scoped to local origin (design invariant 6).
- `/bench.html` page and `pnpm bench`.
- Docker: `whiteboard-app` (nginx serving the build) and `whiteboard-signaling` (Node).

Out (v0.2 or later, listed in DEVDOCS "what's left"): text, arrow and eraser tools; awareness cursors; `.wbjson` export/import; PNG export; dirty-rect painting; resize/rotate handles; npm package for `crdt-core`; TURN or relay; public deploy (no push is allowed in this session).

Ruling: dirty rectangles are dropped from v0.1. The prototype measured 10,000 shapes on a 1280x720 viewport at p95 1.5 ms paint with rbush culling and full repaint of visible shapes, versus p95 14 ms with no culling (headless Chromium, 2026-10-04). Culling alone clears the 16.7 ms budget, so dirty rects are complexity without a measured need (ADR 0004).

Ruling: coordinates and sizes are clamped, not rejected. A drag can never fail. Point counts over the limit, malformed colors and non-finite numbers are rejected. The design's invariant 2 is restated below.

Ruling: freehand points are a plain `number[]` stored as one Yjs value, relative to the shape's `x, y`, not a `Y.Array` (ADR 0002). Moving a stroke rewrites only `x` and `y`.

Ruling: the host has Node 24 and pnpm 9.12, so dev, tests, e2e and bench run on the host (like co-author). Docker is used for the shipped images, actionlint and ffmpeg. The design's "Node only in containers" setup is not followed.

Ruling: Chromium accepts the SVG icon with `sizes: "any"` for installability (prototype: `Page.getInstallabilityErrors` returned `[]`). No PNG icons in v0.1.

## Ports and names

| Port | Use |
|---|---|
| 5410 | `pnpm dev` (Vite) |
| 5411 | `pnpm signaling` (local dev signaling) |
| 5412 | `vite preview` used by e2e and bench (service worker active) |
| 5413 | Docker `whiteboard-app` (nginx) |
| 5414 | Docker `whiteboard-signaling` |
| 5415 | Signaling started by Playwright for e2e and bench |

Docker compose project name `whiteboard`; containers `whiteboard-app`, `whiteboard-signaling`; one-off containers `whiteboard-actionlint`, `whiteboard-ffmpeg` (always `--rm`).

## Data model

```text
Y.Doc
├── shapes: Y.Map<Y.Map>   key = shape id (12 chars, [A-Za-z0-9_-])
└── order:  Y.Array<string> z-order, bottom to top
```

Each shape is a nested `Y.Map` with fields: `id`, `type` (`rect | ellipse | freehand`), `x`, `y`, `w`, `h`, `rotation` (always 0 in v0.1, kept for forward compatibility), `stroke`, `fill`, `strokeWidth`, `points` (freehand only, flat `[x0,y0,x1,y1,...]` relative to `x, y`), `createdBy` (Yjs clientID as a string).

Limits (`LIMITS` in `src/doc/schema.ts`): 20,000 shapes; 4,000 point pairs per stroke; coordinates clamped to plus or minus 1e6; `w`, `h` clamped to [0, 1e5]; `strokeWidth` clamped to [0.5, 32]; points clamped to plus or minus 1e5 (relative).

Origins: `'local'` for commands, `'sanitizer'` for repairs. Persistence and network updates arrive with other origins.

## Invariants and their proving tests

| # | Invariant | Test |
|---|---|---|
| 1 | Only `src/doc/commands.ts` and `src/doc/sanitize.ts` call `transact` (including `Y.transact` and `x['transact']`). `src/crdt-core/` imports nothing from the rest of `src/`. | `tests/lint.test.ts` (oxc-parser AST scan) |
| 2 | Any input with more than 4,000 point pairs returns a `limit` error and leaves the doc byte-identical. Any finite coordinates produce stored values within limits. | `tests/commands.property.test.ts` (fast-check, seed 42, 200 runs) |
| 3 | `addShape` at 20,000 shapes returns a `limit` error. | `tests/commands.test.ts > shape cap` |
| 4 | Three peers that apply random command sequences and exchange updates in shuffled order converge to the same fingerprint (sorted state vector, canonical shapes JSON, order array). | `tests/convergence.property.test.ts` (fast-check, seed 42, 100 runs) |
| 5 | A raw remote update that bypasses commands with a 50,000-pair stroke is truncated to 4,000 pairs on every honest peer, and the peers converge. | `tests/sanitize.test.ts` |
| 6 | Undo reverts only local-origin changes. | `tests/undo.test.ts` |
| 7 | The render list is a pure function of shapes, order and viewport. | `tests/scene.test.ts` |
| 8 | The installed app reloads with no network and shows persisted shapes. | `e2e/offline.spec.ts` |
| 9 | Two browser contexts sync a drawn shape through WebRTC within 5 s. | `e2e/sync.spec.ts` |
| 10 | Chromium reports zero installability errors. | `e2e/pwa.spec.ts` |

Structurally invalid shapes (missing type, wrong field types) are never deleted by the sanitizer. They stay in the doc, the renderer skips them, and the debug overlay counts them. Deleting them could destroy data that is only partly delivered.

## Numbers (targets; README prints only measured values)

| Metric | Target | Source |
|---|---|---|
| Headline: paint ms p95, panning 10,000 shapes, 1280x720 | under 16.7 ms | `bench/results.json` `browser.pan10k.paintP95Ms` |
| Frame interval p95 during the same pan | report only | `browser.pan10k.frameP95Ms` |
| Bytes in the update for one shape move | under 100 | `node.moveUpdateBytes` |
| Peer commit-to-remote-apply latency p50, same machine | under 100 ms | `browser.peerLatency.p50Ms` |
| Convergence | 100% of property runs | vitest output |

Prototype measurements (2026-10-04, scratch, not for README): move update 40 to 46 bytes; two-context WebRTC discovery about 2.8 s with and without STUN; a 10,000-shape synthetic canvas paint p95 1.5 ms culled and 14 ms unculled.

## Acceptance (the gates)

1. `pnpm typecheck` exits 0.
2. `pnpm test` passes, including the property tests.
3. `pnpm build` exits 0 and `dist/sw.js` and `dist/manifest.webmanifest` exist.
4. `pnpm e2e` passes (sync, offline, pwa, draw).
5. `pnpm bench` writes `bench/results.json` with all four numbers.
6. `docker compose up -d --build` serves `http://localhost:5413/` (200) and `http://localhost:5414/` (`okay`); `docker compose down` afterwards.
7. `docker run --rm --name whiteboard-actionlint -v "${PWD}:/repo" -w /repo rhysd/actionlint:1.7.12 -color` exits 0.
8. README's first line quotes the headline number from `bench/results.json` with the machine line.
9. `git status --short` is clean and no `.env` or secret is committed.
