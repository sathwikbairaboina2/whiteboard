# ADR 0008: "Installable" means the PWA plus Docker images; crdt-core stays in-repo

Date: 2026-10-04. Status: accepted.

## Context
The portfolio bar asks for something others install. The design suggests publishing `crdt-core` to npm for Co-author, which already shipped with its own Yjs wiring.

## Decision
- The installable artifact is the PWA (`vite-plugin-pwa@2.0.0`, Workbox precache, SVG icon). `e2e/pwa.spec.ts` asserts that Chromium's CDP `Page.getInstallabilityErrors` returns an empty list (prototype confirmed the SVG icon with `sizes: "any"` is enough).
- `src/crdt-core/` holds the reusable part (persistence, sync, room links) behind `src/crdt-core/index.ts`. `tests/lint.test.ts` fails if it imports from the rest of `src/`, so it can be extracted later without untangling.
- The two Docker images are the self-hosting path.

## Consequences
- What I gave up: no npm package and no download count in v0.1. Extraction is listed as v0.2 work.
- What I gave up: no PNG icons, so iOS home-screen icons fall back to a page screenshot.
