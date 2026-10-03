# whiteboard v0.1 ledger

Plan: docs/superpowers/plans/2026-10-04-whiteboard.md
Spec: docs/superpowers/specs/2026-10-04-whiteboard.md
Gates: see the "Gates" table at the end of the plan.
Format: one line per task, `Task N: complete (tests: <command> -> <real count> passed; <other checks>)` or `Task N: partial (<what is left>)`.

Task 0 (plan, Opus): complete (spec, ADRs 0001-0008, plan with 25 tasks; plan code prototyped in scratch: vitest 17 files / 54 tests passed, tsc 7.0.2 clean; browser prototypes: y-webrtc two-context sync, SW offline reload, CDP installability [] all passed)
Task 1: complete (tests: pnpm test -> 1 passed; typecheck exit 0; vite build ok)
Task 2: complete (tests: pnpm exec vitest run tests/schema.test.ts -> 2 passed; typecheck exit 0)
Task 3: complete (tests: vitest tests/commands.test.ts -> 9 passed; typecheck exit 0)
Task 4: complete (tests: vitest commands.property -> 2 passed; mutation maxPointPairs*4 failed with counterexample [4001,0], reverted)
Task 5: complete (tests: vitest lint -> 3 passed; adding transact to board.ts failed naming src/doc/board.ts, reverted). Note: Task 4/5 test files were committed together with Task 3
Task 6: complete (tests: vitest sanitize+lint -> 7 passed; typecheck exit 0)
Task 7: complete (tests: vitest convergence.property -> 1 passed, seed 42, 100 runs; skipping delivery to peer 2 failed with counterexample, reverted)
Task 8: complete (tests: vitest undo -> 2 passed; typecheck exit 0)
Task 9: complete (tests: vitest room+persistence -> 6 passed, lint 3 passed; typecheck exit 0)
Task 10: complete (tests: vitest sync -> 1 passed; typecheck exit 0)
Task 11: complete (tests: vitest signaling -> 4 passed; real run: PORT=5411 node server/signaling.ts printed 'signaling listening on 5411', curl -> okay, stopped)
Task 12: complete (tests: vitest render -> 3 passed; typecheck exit 0)
Task 13: complete (tests: vitest scene -> 5 passed; typecheck exit 0)
Task 14: complete (tests: vitest store -> 1 passed, lint 3 passed)
Task 15: complete (tests: vitest app -> 4 passed; typecheck exit 0)
Task 16: complete (tests: pnpm test -> 17 files, 54 tests passed; typecheck exit 0)
Task 17: complete (typecheck exit 0; vitest lint -> 3 passed; no unit test by plan, covered by e2e)
Task 18: complete (tests: pnpm test -> 17 files 54 passed; pnpm build ok; screenshots 1280x800 and 375x812 checked, drew rect -> data-shapes 1, no console errors; fixed toolbar wrap at 375px)
Task 19: complete (tests: pnpm test -> 54 passed; pnpm build ok, precache 12 entries, dist/sw.js and dist/manifest.webmanifest exist)
Task 20: complete (tests: pnpm e2e -> 3 passed (draw x2, pwa); ports 5412/5415 free afterwards)
Task 21: complete (tests: pnpm e2e -> 5 passed (draw x2, pwa, sync, offline); 3 consecutive runs 5/5, 5/5, 5/5)
Ruling: fit10k pan step scaled by min(1, zoom) (0.16 zoom -> 1.28 px/frame) - plan's fixed 8 px/frame at zoom 0.16 moves the camera 50 world units/frame and leaves the 8000-unit world after ~160 frames (first run drawnAvg 1345 of 10000) - cost if wrong: fit10k is a slower pan than the plan literally says; pan10k (zoom 1) is unchanged
Task 22: complete (tests: pnpm test -> 18 files 56 passed; pnpm bench -> HEADLINE: 1.5 ms p95 paint per frame panning 10,000 shapes (Chromium 153.0.8010.12, AMD Ryzen 9 7900X 12-Core Processor); pan10k paintP95 1.5, fit10k paintP95 7 (drawnAvg 4799.52), peerLatency p50 0.8 p95 1.3 ms, moveUpdateBytes 43, addRectUpdateBytes 278, docBytes10k 4942516, convergence 3x1000 ops converged=true 10242 ms; pan10k under 16.7 ms)
Task 23: complete (docker compose up -d --build -> whiteboard-app and whiteboard-signaling started; curl :5413 -> 200; curl :5414 -> okay; docker compose down -> no whiteboard-* container left)
Task 24: complete (actionlint 1.7.12 via docker (MSYS_NO_PATHCONV=1 needed under Git Bash) -> exit 0, no output)
Task 25: complete (pnpm demo -> docs/media/demo.gif 0.63 MB, frame checked; gates: typecheck 0; pnpm test 18 files 56 passed; pnpm build 0 + sw.js + manifest; pnpm e2e 5 passed; pnpm bench HEADLINE 5.3 ms p95 (final run, shared machine; fit10k paint p95 21.7 ms over budget; peerLatency p50 3 p95 19.6; convergence 37237 ms converged true); docker 200/okay/down clean; actionlint 0)
Review fix: demo and merge - added debug hook (?debug=1 or ?hook=1 exposes window.__session.disconnect/reconnect, backed by provider.disconnect/connect); e2e/merge.spec.ts proves offline edits on both sides merge to 3 shapes after reconnect; demo.spec.ts now uses the hook and asserts 4 shapes on A before 5/5 after reconnect; demo.gif re-recorded (0.61 MB)
Review fix: last room - src/app/lastRoom.ts (localStorage whiteboard:lastRoom, try/catch), main.tsx uses chooseRoom; tests/lastRoom.test.ts (4 tests), e2e/lastroom.spec.ts; ADR 0005 updated
Review fix: convergence ms removed from README table (boolean only) with a note that the time is harness backlog, not app latency; results.json still records ms
Review fix: e2e ROOM() id now tag(4)+base36 time tail+random, no longer collides across runs
Review fix: nginx serves /manifest.webmanifest as application/manifest+json (curl -I verified); .dockerignore excludes .env* except examples
Review fix: signaling unsubscribe deletes empty topics; test checks topicCount via new SignalingServer.topicCount()
Review fix: README line 1 now carries "(Ryzen 9 7900X, Chromium 153)"; README/DEVDOCS/handoff numbers refreshed from the new bench/results.json (pan10k p95 3.2 ms)
Review fix gates: typecheck 0; pnpm test 19 files 60 passed 0 skipped; pnpm build 0 + sw.js + manifest; pnpm e2e 7 passed; pnpm bench HEADLINE 3.2 ms (fit10k p95 13.6, peer p50 2.9, convergence true); docker 200/okay/down clean, manifest content-type ok; actionlint 0

- Step 5 (Opus): verified both review fixes; gates green (typecheck, 60 unit, build, 7 e2e, docker smoke). DEVDOCS rewritten. Status: verified.
