**3.2 ms p95 paint per frame panning 10,000 shapes (Ryzen 9 7900X, Chromium 153), offline-first, and no server ever holds your data.**

# Whiteboard

![Two boards in two browser contexts staying in sync](docs/media/demo.gif)

A local-first whiteboard. Shapes live in a Yjs CRDT, persist to IndexedDB, and sync peer to peer over WebRTC. The only server is a small signaling relay that never stores anything. The app is an installable PWA and keeps working offline.

## Try it

```bash
pnpm install
pnpm signaling   # signaling on :5411
pnpm dev         # app on http://localhost:5410/
# open the same URL (with its #room=...&key=... fragment) in a second browser profile
pnpm test        # unit and property tests
pnpm e2e         # browser tests
```

## Measured

All numbers come from `bench/results.json`, written by `pnpm bench`. Machine: AMD Ryzen 9 7900X 12-Core Processor, 24 cores, win32 10.0.26200, Node v24.18.0, Chromium 153.0.8010.12. Run on 2026-10-03T23:22:38Z. The machine was shared with other jobs, so numbers move between runs (earlier runs of the same benchmark gave a pan10k paint p95 between 1.5 and 5.3 ms; see the ledger).

| Metric | Value |
|---|---|
| Pan, 10,000 shapes, paint p50 / p95 | 1.8 ms / 3.2 ms |
| Pan, 10,000 shapes, frame interval p50 / p95 | 16.7 ms / 16.8 ms |
| Whole board in view (zoom 0.16), paint p50 / p95 | 8.1 ms / 13.6 ms |
| Whole board in view, frame interval p50 / p95 | 33.3 ms / 33.4 ms |
| Peer latency, 50 edits across two browser contexts, p50 / p95 | 2.9 ms / 29.3 ms |
| Update size, move one shape | 43 bytes |
| Update size, add one rectangle | 278 bytes |
| Encoded document, 10,000 shapes | 4,809,549 bytes |
| Convergence, 3 peers x 1,000 random commands, shuffled delivery | converged (true) |

The convergence run takes about 38 s of harness time, not shown as a result: the harness delivers fewer updates per round than the peers produce, so roughly 1,500 out-of-order updates queue up and Yjs pending-struct merging dominates. That time is not app latency, and it varied from 10 s to 73 s across runs of the same code.

Paint time covers JavaScript and Canvas2D command submission, not GPU raster (ADR 0004). With the whole 10,000-shape board in view the paint p95 is 13.6 ms on this run, under the 16.7 ms budget but with little headroom (an earlier run on a busier machine measured 21.7 ms), so zoomed-out views of very large boards are the known weak spot.

## How it works

- Command layer: every local write goes through `src/doc/commands.ts`, which validates, clamps and writes in one transaction. A lint test fails if anything else calls `transact`.
- Sanitizer: remote or stored data that breaks the limits is repaired deterministically, so honest peers still converge.
- CRDT: one `Y.Doc` per tab, a map of shapes plus an order array. Undo only reverts your own commands.
- WebRTC and signaling: `y-webrtc` carries updates directly between peers. `server/signaling.ts` only relays connection setup. The room key lives in the URL fragment and never reaches a server.
- PWA: a service worker precaches the app, and IndexedDB keeps the board, so a reload works offline.

## What I gave up

See the decision records: [0001 y-webrtc, not y-websocket](docs/adr/0001-y-webrtc-over-y-websocket.md), [0002 document layout](docs/adr/0002-document-layout.md), [0003 command layer and sanitizer](docs/adr/0003-command-layer-and-sanitizer.md), [0004 culling, no dirty rects](docs/adr/0004-canvas-culling-no-dirty-rects.md), [0005 room secret in the fragment](docs/adr/0005-room-secret-in-fragment.md), [0006 deterministic tests](docs/adr/0006-deterministic-tests.md), [0007 host Node and Docker](docs/adr/0007-ports-docker-and-host-node.md), [0008 installable means PWA](docs/adr/0008-installable-means-pwa.md).

## Tests

- `pnpm test`: 19 files, 60 tests passed, 0 skipped. Includes `commands.property` and `convergence.property` with fixed seed 42.
- `pnpm e2e`: 7 tests passed (draw, undo and delete, PWA installability, two-context WebRTC sync, offline reload, edits made while disconnected merging after reconnect, reopening `/` returns to the last board).

## License

MIT. `server/signaling.ts` is based on the signaling server in [y-webrtc](https://github.com/yjs/y-webrtc) (MIT, Kevin Jahns).
