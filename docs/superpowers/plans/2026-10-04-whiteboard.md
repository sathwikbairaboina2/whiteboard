# Whiteboard v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax. Record each finished task in the ledger (see Global Constraints).

**Goal:** Ship an offline-first, installable whiteboard where shapes live in a Yjs CRDT, sync peer to peer over WebRTC, persist to IndexedDB, and a measured benchmark backs the README headline.

**Architecture:** One `Y.Doc` per tab. Every local write goes through `src/doc/commands.ts` (validate, clamp, one `transact`). A sanitizer repairs over-limit remote data. A read-only `BoardStore` caches validated shapes plus an rbush index; a pure scene builder and a Canvas2D painter draw only visible shapes on `requestAnimationFrame`. `src/crdt-core/` wraps y-indexeddb, y-webrtc and room links. React renders only the chrome; a DOM controller owns the canvas.

**Tech stack (exact versions, all checked on npm 2026-10-04):** Node 24, pnpm 9.12.0, yjs 13.6.33, y-webrtc 10.3.0, y-indexeddb 9.0.12, y-protocols 1.0.7, lib0 0.2.119, zod 4.6.5, rbush 4.0.1, nanoid 6.0.1, ws 8.22.0, react 19.3.0, react-dom 19.3.0, @phosphor-icons/react 2.1.10, @fontsource-variable/geist 5.3.0; dev: typescript 7.0.2, vite 8.3.2, @vitejs/plugin-react 6.1.1, vite-plugin-pwa 2.0.0, workbox-window 7.4.1, vitest 5.0.3, fast-check 4.10.2, fake-indexeddb 6.2.5, @playwright/test 1.63.0, oxc-parser 0.152.0, tsx 4.23.15, @types/node 26.6.4, @types/react 19.3.0, @types/react-dom 19.3.0, @types/rbush 4.0.0, @types/ws 8.18.2. Docker: node:24-alpine, nginx:1.29-alpine, rhysd/actionlint:1.7.12, jrottenberg/ffmpeg:7.1-alpine (all tags verified with `docker manifest inspect`).

**Spec:** `docs/superpowers/specs/2026-10-04-whiteboard.md`. **ADRs:** `docs/adr/0001` to `0008`. **Ledger:** `.superpowers/sdd/2026-10-04-whiteboard/progress.md`.

## Already done by the planner (do not redo)

- `git init -b main` in `C:\Users\sathwik\projects\taskarinchu\whiteboard`. Git identity is configured globally.
- Spec, ADRs, this plan and the ledger are written and committed.
- Prototypes run on 2026-10-04 (scratch, not in the repo):
  - Tasks 2 to 16 below contain code that was written and run in a scratch copy of this exact layout: `pnpm test` gave 17 files and 54 tests passing, and `pnpm typecheck` (TypeScript 7.0.2) was clean. Copy it verbatim.
  - y-webrtc 10.3.0 under Vite 8 (dev and production build) synced two Playwright Chromium contexts through a local signaling server, with STUN and with `iceServers: []`. No Node polyfills were needed.
  - vite-plugin-pwa 2.0.0 + Vite 8 preview: offline reload served the app from the service worker and IndexedDB state survived. CDP `Page.getInstallabilityErrors` returned `[]` with only an SVG icon.
  - TypeScript 7 has no JavaScript compiler API, so the AST lint uses oxc-parser.
  - `node server/signaling.ts` runs directly (Node 24 type stripping) and answers `okay` over HTTP.

## Global constraints

- Work only inside `C:\Users\sathwik\projects\taskarinchu\whiteboard`. Never edit sibling repos. Never push, never add a remote, never open a PR.
- Ports: dev 5410, dev signaling 5411, preview 5412, Docker app 5413, Docker signaling 5414, e2e/bench signaling 5415. Always `--strictPort`. Nothing else in 5400 to 5409 or 5416+ unless this plan says so.
- Docker names start with `whiteboard-`. Stop every container you start (`docker compose down`, `--rm` for one-offs).
- Use exactly the versions above. Do not add dependencies that are not listed. Do not touch `pnpm-lock.yaml` by hand.
- Never invent numbers. README and DEVDOCS numbers come from `bench/results.json`, quoted with its machine line.
- No em dash or en dash characters in UI copy, README or docs. Use a comma, period or hyphen.
- `import type` for type-only imports. Match the code style of the provided files (2 spaces, single quotes, no semicolons).
- Each task ends with exactly one commit with the subject given, then a blank line, then `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Commit only after that task's checks pass. Never commit `node_modules`, `dist`, `dev-dist`, `test-results`, `playwright-report`, `bench/results/`, or any `.env`.
- After each task append one line to `.superpowers/sdd/2026-10-04-whiteboard/progress.md`: `Task N: complete (tests: <command> -> <real count> passed; <other checks>)`. Include it in that task's commit. If you stop early, write `Task N: partial (<what is left>)`.
- Load the `design-taste-frontend` skill before Task 18 (UI work), per the user's global rules.
- If a step's expected output does not match, stop and debug (superpowers:systematic-debugging). Do not weaken a test to make it pass.

## Review focus (the reviewer will check these first)

1. Only `commands.ts` and `sanitize.ts` call `transact` (Task 5 lint). No test is skipped or `.only`.
2. Convergence and limit property tests use `seed: 42` and the run counts in this plan (Tasks 4 and 7).
3. Drawing commits one update per gesture, never one per pointermove (Task 16 tests).
4. E2E sync uses two separate browser contexts (not two pages in one context, which would sync over BroadcastChannel and prove nothing about WebRTC) (Task 21).
5. Every README number is traceable to `bench/results.json` (Task 25).

## File map

```text
whiteboard/
  package.json, pnpm-lock.yaml, tsconfig.json, vite.config.ts, vitest.config.ts,
  playwright.config.ts, playwright.bench.config.ts, index.html, bench.html,
  .gitignore, .nvmrc, .dockerignore, Dockerfile, docker-compose.yml, deploy/nginx.conf
  .github/workflows/ci.yml
  public/icon.svg
  server/signaling.ts            y-webrtc signaling (pub/sub over ws)
  src/
    main.tsx                     entry: config, room, Session, React root, SW registration
    vite-env.d.ts
    crdt-core/                   reusable: room.ts, persistence.ts, sync.ts, index.ts
    doc/board.ts                 root types and origins
    doc/schema.ts                zod schemas, LIMITS, parseShape, shapeBounds
    doc/commands.ts              the only local write path
    doc/sanitize.ts              repairs over-limit remote data
    history/undo.ts              UndoManager scoped to local origin
    render/camera.ts, geometry.ts, spatial.ts, scene.ts, canvas.ts, store.ts, loop.ts
    tools/tools.ts               select, rect, ellipse, freehand
    app/config.ts, session.ts, controller.ts
    ui/tokens.css, app.css, App.tsx, TopBar.tsx, Toolbar.tsx, DebugOverlay.tsx, useOnline.ts, useInstallPrompt.ts
    bench/random.ts, bench/synthetic.ts, bench/main.ts
  tests/                         vitest (node environment)
  e2e/                           Playwright: draw, pwa, sync, offline, demo
  bench/node.ts, bench/browser.spec.ts, bench/report.ts, bench/results.json
  scripts/demo-gif.ts
  docs/                          spec, plan, ADRs, DEVDOCS.md, handoff.md, media/demo.gif
  README.md
```

---

### Task 1: Scaffold

**Files:** create `package.json`, `tsconfig.json`, `vitest.config.ts`, `vite.config.ts`, `index.html`, `.gitignore`, `.nvmrc`, `src/main.tsx`, `src/vite-env.d.ts`, `tests/smoke.test.ts`.

- [ ] **Step 1: `package.json`**

```json
{
  "name": "whiteboard",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "vite --port 5410 --strictPort",
    "signaling": "node server/signaling.ts",
    "build": "pnpm typecheck && vite build",
    "preview": "vite preview --port 5412 --strictPort",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "e2e": "playwright test",
    "bench": "tsx bench/node.ts && playwright test --config playwright.bench.config.ts && tsx bench/report.ts",
    "demo": "playwright test --grep @demo --grep-invert @never && tsx scripts/demo-gif.ts"
  }
}
```

- [ ] **Step 2: install pinned dependencies**

```bash
pnpm add --save-exact yjs@13.6.33 y-webrtc@10.3.0 y-indexeddb@9.0.12 y-protocols@1.0.7 lib0@0.2.119 zod@4.6.5 rbush@4.0.1 nanoid@6.0.1 ws@8.22.0 react@19.3.0 react-dom@19.3.0 @phosphor-icons/react@2.1.10 @fontsource-variable/geist@5.3.0
pnpm add --save-exact -D typescript@7.0.2 vite@8.3.2 @vitejs/plugin-react@6.1.1 vite-plugin-pwa@2.0.0 workbox-window@7.4.1 vitest@5.0.3 fast-check@4.10.2 fake-indexeddb@6.2.5 @playwright/test@1.63.0 oxc-parser@0.152.0 tsx@4.23.15 @types/node@26.6.4 @types/react@19.3.0 @types/react-dom@19.3.0 @types/rbush@4.0.0 @types/ws@8.18.2
```

Expected: both end with `Done in`. If pnpm warns about missing peer `workbox-build`, run `pnpm add --save-exact -D workbox-build@7.4.1` (check the version with `npm view workbox-build version` first; use 7.4.x).

- [ ] **Step 3: config files**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "resolveJsonModule": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "tests", "server", "bench", "e2e", "scripts", "vite.config.ts", "vitest.config.ts", "playwright.config.ts", "playwright.bench.config.ts"]
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
  },
})
```

`vite.config.ts` (PWA is added in Task 19, bench input in Task 22):

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5410, strictPort: true },
  preview: { port: 5412, strictPort: true },
})
```

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="description" content="An offline-first whiteboard. Shapes sync peer to peer and no server holds your data." />
    <meta name="theme-color" content="#f6f5f1" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <title>Whiteboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`.gitignore`:

```text
node_modules
dist
dev-dist
coverage
test-results
playwright-report
bench/results/
*.log
.env*
!.env*.example
```

`.nvmrc`: `24`

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SIGNALING_URLS?: string
}
```

`src/main.tsx` (placeholder, replaced in Task 18):

```tsx
document.getElementById('root')!.textContent = 'Whiteboard'
```

`tests/smoke.test.ts`:

```ts
import { expect, it } from 'vitest'
import * as Y from 'yjs'

it('yjs loads', () => {
  expect(new Y.Doc().getMap('shapes').size).toBe(0)
})
```

- [ ] **Step 4: verify**

```bash
pnpm test        # expect: Test Files 1 passed, Tests 1 passed
pnpm typecheck   # expect: exit 0, no output after the script line
pnpm exec vite build   # expect: "built in"
```

- [ ] **Step 5: commit** `chore: scaffold vite, react, typescript and vitest`

---

### Task 2: Board roots and shape schema

**Files:** create `src/doc/board.ts`, `src/doc/schema.ts`, `tests/schema.test.ts`.

- [ ] **Step 1: write the failing test** `tests/schema.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { parseShape, shapeBounds, type Shape } from '../src/doc/schema'

const base: Shape = { id: 'aaaaaaaaaaaa', type: 'rect', x: 1, y: 2, w: 3, h: 4, rotation: 0, stroke: '#1e1e1e', fill: 'transparent', strokeWidth: 2, createdBy: '1' }

describe('schema', () => {
  it('accepts a valid rect and pads bounds by half the stroke', () => {
    expect(parseShape(base)).toEqual(base)
    expect(shapeBounds(base)).toEqual({ minX: 0, minY: 1, maxX: 5, maxY: 7 })
  })

  it('rejects bad ids, colors, types, non-finite numbers and misplaced points', () => {
    expect(parseShape({ ...base, id: 'short' })).toBeNull()
    expect(parseShape({ ...base, stroke: 'red' })).toBeNull()
    expect(parseShape({ ...base, type: 'hexagon' })).toBeNull()
    expect(parseShape({ ...base, x: Infinity })).toBeNull()
    expect(parseShape({ ...base, points: [1, 2] })).toBeNull()
    expect(parseShape({ ...base, type: 'freehand' })).toBeNull()
    expect(parseShape({ ...base, type: 'freehand', points: [1, 2, 3] })).toBeNull()
    expect(parseShape({ ...base, type: 'freehand', points: [1, 2] })).not.toBeNull()
  })
})
```

- [ ] **Step 2:** `pnpm exec vitest run tests/schema.test.ts` → fails (module not found).

- [ ] **Step 3: implement** `src/doc/board.ts`:

```ts
import * as Y from 'yjs'

/** Origin of every transaction made by the command layer. UndoManager tracks only this. */
export const ORIGIN_LOCAL = 'local'
/** Origin of repairs made by the sanitizer. */
export const ORIGIN_SANITIZER = 'sanitizer'

export type ShapeMap = Y.Map<unknown>

export interface Board {
  doc: Y.Doc
  shapes: Y.Map<ShapeMap>
  order: Y.Array<string>
}

export function getBoard(doc: Y.Doc): Board {
  return { doc, shapes: doc.getMap<ShapeMap>('shapes'), order: doc.getArray<string>('order') }
}
```

`src/doc/schema.ts`:

```ts
import { z } from 'zod'

export const LIMITS = {
  maxShapes: 20_000,
  maxPointPairs: 4_000,
  maxCoord: 1e6,
  maxSize: 1e5,
  maxPointCoord: 1e5,
  minStrokeWidth: 0.5,
  maxStrokeWidth: 32,
} as const

export type LimitName = keyof typeof LIMITS

export const SHAPE_TYPES = ['rect', 'ellipse', 'freehand'] as const
export type ShapeType = (typeof SHAPE_TYPES)[number]

export const ColorSchema = z.union([z.string().regex(/^#[0-9a-f]{6}$/), z.literal('transparent')])
export const ShapeIdSchema = z.string().regex(/^[A-Za-z0-9_-]{12}$/)

/** A stored shape. z.number() rejects NaN and +/-Infinity in zod 4. */
export const ShapeSchema = z.object({
  id: ShapeIdSchema,
  type: z.enum(SHAPE_TYPES),
  x: z.number(),
  y: z.number(),
  w: z.number().min(0),
  h: z.number().min(0),
  rotation: z.number(),
  stroke: ColorSchema,
  fill: ColorSchema,
  strokeWidth: z.number(),
  points: z.array(z.number()).optional(),
  createdBy: z.string(),
})
export type Shape = z.infer<typeof ShapeSchema>

/** Input to addShape. Sizes may be negative (drag up or left); commands normalise them. */
export const NewShapeSchema = z.object({
  id: ShapeIdSchema.optional(),
  type: z.enum(SHAPE_TYPES),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  stroke: ColorSchema.default('#1e1e1e'),
  fill: ColorSchema.default('transparent'),
  strokeWidth: z.number().default(2),
  points: z.array(z.number()).optional(),
})
export type NewShape = z.input<typeof NewShapeSchema>

export const StylePatchSchema = z.object({
  stroke: ColorSchema.optional(),
  fill: ColorSchema.optional(),
  strokeWidth: z.number().optional(),
})
export type StylePatch = z.input<typeof StylePatchSchema>

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** Structural check used by the renderer. Returns null for anything it must not draw. */
export function parseShape(raw: unknown): Shape | null {
  const r = ShapeSchema.safeParse(raw)
  if (!r.success) return null
  const s = r.data
  if (s.type === 'freehand') {
    if (!s.points || s.points.length < 2 || s.points.length % 2 !== 0) return null
  } else if (s.points !== undefined) return null
  return s
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** World-space bounds, padded by half the stroke width. */
export function shapeBounds(s: Shape): Bounds {
  const pad = s.strokeWidth / 2
  return { minX: s.x - pad, minY: s.y - pad, maxX: s.x + s.w + pad, maxY: s.y + s.h + pad }
}
```

- [ ] **Step 4:** `pnpm exec vitest run tests/schema.test.ts` → 2 passed. `pnpm typecheck` → exit 0.

- [ ] **Step 5: commit** `feat(doc): add board roots, shape schema and limits`

---

### Task 3: Command layer

**Files:** create `src/doc/commands.ts`, `tests/helpers.ts`, `tests/commands.test.ts`.

- [ ] **Step 1: test helpers** `tests/helpers.ts` (the in-memory network and the canonical fingerprint are used by later tasks). Note: Task 22 moves `mulberry32` into `src/bench/random.ts` and re-exports it here.

```ts
import * as Y from 'yjs'
import { getBoard } from '../src/doc/board'

export const NET = 'net'

/** Deterministic PRNG for shuffles. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makePeer(clientID: number): Y.Doc {
  const doc = new Y.Doc()
  doc.clientID = clientID
  return doc
}

/**
 * In-memory network. Every update a peer makes (any origin except NET) is queued.
 * deliver() hands queued updates to every other peer, in a shuffled order if a PRNG is given.
 */
export class TestNetwork {
  private queue: Array<{ from: number; update: Uint8Array }> = []

  constructor(readonly peers: Y.Doc[]) {
    peers.forEach((doc, i) => {
      doc.on('update', (update: Uint8Array, origin: unknown) => {
        if (origin !== NET) this.queue.push({ from: i, update })
      })
    })
  }

  get pending(): number {
    return this.queue.length
  }

  /** Deliver up to `max` queued updates (all by default). Repairs made on delivery are queued too. */
  deliver(rand?: () => number, max = Infinity): void {
    let n = 0
    while (this.queue.length > 0 && n < max) {
      const idx = rand ? Math.floor(rand() * this.queue.length) : 0
      const [msg] = this.queue.splice(idx, 1)
      this.peers.forEach((doc, i) => { if (i !== msg.from) Y.applyUpdate(doc, msg.update, NET) })
      n++
    }
  }
}

const canon = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canon)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, x]) => [k, canon(x)]))
      : v

/** Canonical board state: sorted state vector, key-sorted shapes, order array. */
export function fingerprint(doc: Y.Doc): string {
  const sv = [...Y.decodeStateVector(Y.encodeStateVector(doc))].sort((a, b) => a[0] - b[0])
  const { shapes, order } = getBoard(doc)
  return JSON.stringify(canon({ sv, shapes: shapes.toJSON(), order: order.toArray() }))
}

export const rectInput = (id: string, x = 0, y = 0) => ({ id, type: 'rect' as const, x, y, w: 10, h: 10 })
```

- [ ] **Step 2: failing tests** `tests/commands.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { getBoard } from '../src/doc/board'
import { addShape, addShapes, deleteShapes, moveShapes, setStyle } from '../src/doc/commands'
import { LIMITS, parseShape } from '../src/doc/schema'
import { makePeer, rectInput } from './helpers'

describe('commands', () => {
  it('addShape stores a valid shape and appends it to the order', () => {
    const doc = makePeer(1)
    const r = addShape(doc, rectInput('aaaaaaaaaaaa', 5, 6))
    expect(r.ok).toBe(true)
    const { shapes, order } = getBoard(doc)
    expect(order.toArray()).toEqual(['aaaaaaaaaaaa'])
    expect(parseShape(shapes.get('aaaaaaaaaaaa')!.toJSON())).toMatchObject({ x: 5, y: 6, w: 10, h: 10, stroke: '#1e1e1e', fill: 'transparent', strokeWidth: 2, rotation: 0, createdBy: '1' })
  })

  it('normalises negative sizes', () => {
    const doc = makePeer(1)
    const r = addShape(doc, { id: 'bbbbbbbbbbbb', type: 'ellipse', x: 100, y: 100, w: -40, h: -20 })
    expect(r.ok && r.value).toMatchObject({ x: 60, y: 80, w: 40, h: 20 })
  })

  it('stores freehand points relative to their bounding box', () => {
    const doc = makePeer(1)
    const r = addShape(doc, { id: 'cccccccccccc', type: 'freehand', x: 0, y: 0, w: 0, h: 0, points: [10, 20, 30, 5, 15, 25] })
    expect(r.ok && r.value).toMatchObject({ x: 10, y: 5, w: 20, h: 20, points: [0, 15, 20, 0, 5, 20] })
  })

  it('rejects bad colors, odd points and points on rects without writing', () => {
    const doc = makePeer(1)
    const before = Y.encodeStateAsUpdate(doc)
    const bad = [
      { ...rectInput('dddddddddddd'), stroke: 'red' },
      { id: 'eeeeeeeeeeee', type: 'freehand' as const, x: 0, y: 0, w: 0, h: 0, points: [1, 2, 3] },
      { ...rectInput('ffffffffffff'), points: [1, 2] },
      { ...rectInput('gggggggggggg'), x: Number.NaN },
    ]
    for (const input of bad) {
      const r = addShape(doc, input)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.kind).toBe('validation')
    }
    expect(Y.encodeStateAsUpdate(doc)).toEqual(before)
  })

  it('rejects duplicate ids', () => {
    const doc = makePeer(1)
    addShape(doc, rectInput('hhhhhhhhhhhh'))
    const r = addShape(doc, rectInput('hhhhhhhhhhhh'))
    expect(!r.ok && r.error.message).toContain('duplicate')
  })

  it('shape cap: refuses to go past LIMITS.maxShapes', () => {
    const doc = makePeer(1)
    const many = Array.from({ length: LIMITS.maxShapes }, (_, i) => ({ type: 'rect' as const, x: i, y: 0, w: 1, h: 1 }))
    expect(addShapes(doc, many).ok).toBe(true)
    const r = addShape(doc, rectInput('iiiiiiiiiiii'))
    expect(!r.ok && r.error).toMatchObject({ kind: 'limit', limit: 'maxShapes' })
    expect(getBoard(doc).shapes.size).toBe(LIMITS.maxShapes)
  })

  it('moveShapes clamps, skips unknown ids and writes one small update', () => {
    const doc = makePeer(1)
    addShape(doc, rectInput('jjjjjjjjjjjj', 0, 0))
    let bytes = 0
    doc.on('update', (u: Uint8Array) => { bytes = u.byteLength })
    const r = moveShapes(doc, ['jjjjjjjjjjjj', 'missing00000'], 5e6, 3)
    expect(r).toEqual({ ok: true, value: 1 })
    expect(getBoard(doc).shapes.get('jjjjjjjjjjjj')!.get('x')).toBe(LIMITS.maxCoord)
    expect(bytes).toBeGreaterThan(0)
    expect(bytes).toBeLessThan(100)
    expect(moveShapes(doc, ['jjjjjjjjjjjj'], Infinity, 0).ok).toBe(false)
  })

  it('setStyle validates colors and clamps stroke width', () => {
    const doc = makePeer(1)
    addShape(doc, rectInput('kkkkkkkkkkkk'))
    expect(setStyle(doc, ['kkkkkkkkkkkk'], { fill: '#ff0000', strokeWidth: 99 })).toEqual({ ok: true, value: 1 })
    const m = getBoard(doc).shapes.get('kkkkkkkkkkkk')!
    expect([m.get('fill'), m.get('strokeWidth')]).toEqual(['#ff0000', LIMITS.maxStrokeWidth])
    expect(setStyle(doc, ['kkkkkkkkkkkk'], { stroke: 'blue' }).ok).toBe(false)
  })

  it('deleteShapes removes the shape and its order entry', () => {
    const doc = makePeer(1)
    addShapes(doc, [rectInput('llllllllllll'), rectInput('mmmmmmmmmmmm')])
    expect(deleteShapes(doc, ['llllllllllll', 'nope00000000'])).toEqual({ ok: true, value: 1 })
    const { shapes, order } = getBoard(doc)
    expect([...shapes.keys()]).toEqual(['mmmmmmmmmmmm'])
    expect(order.toArray()).toEqual(['mmmmmmmmmmmm'])
  })
})
```

- [ ] **Step 3:** run `pnpm exec vitest run tests/commands.test.ts` → fails (module not found).

- [ ] **Step 4: implement** `src/doc/commands.ts`

```ts
import * as Y from 'yjs'
import { nanoid } from 'nanoid'
import { getBoard, ORIGIN_LOCAL, type Board } from './board'
import { LIMITS, NewShapeSchema, StylePatchSchema, clamp, type LimitName, type NewShape, type Shape, type StylePatch } from './schema'

export type CommandError =
  | { kind: 'validation'; message: string }
  | { kind: 'limit'; message: string; limit: LimitName }

export type Result<T> = { ok: true; value: T } | { ok: false; error: CommandError }

const ok = <T>(value: T): Result<T> => ({ ok: true, value })
const invalid = <T>(message: string): Result<T> => ({ ok: false, error: { kind: 'validation', message } })
const overLimit = <T>(limit: LimitName, message: string): Result<T> => ({ ok: false, error: { kind: 'limit', limit, message } })

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Validate, clamp and normalise one new shape. Pure: never touches the doc. */
export function prepareShape(input: NewShape, createdBy: string): Result<Shape> {
  const parsed = NewShapeSchema.safeParse(input)
  if (!parsed.success) {
    return invalid(parsed.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; '))
  }
  const p = parsed.data
  let { x, y, w, h } = p
  let points: number[] | undefined
  if (p.type === 'freehand') {
    if (!p.points || p.points.length < 2 || p.points.length % 2 !== 0) {
      return invalid('points: freehand needs an even number of values and at least one pair')
    }
    if (p.points.length / 2 > LIMITS.maxPointPairs) {
      return overLimit('maxPointPairs', `stroke has ${p.points.length / 2} point pairs, limit is ${LIMITS.maxPointPairs}`)
    }
    const pts = p.points.map((v) => clamp(v, -LIMITS.maxPointCoord, LIMITS.maxPointCoord))
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (let i = 0; i < pts.length; i += 2) {
      minX = Math.min(minX, pts[i]); maxX = Math.max(maxX, pts[i])
      minY = Math.min(minY, pts[i + 1]); maxY = Math.max(maxY, pts[i + 1])
    }
    points = pts.map((v, i) => (i % 2 === 0 ? v - minX : v - minY))
    x += minX; y += minY; w = maxX - minX; h = maxY - minY
  } else {
    if (p.points !== undefined) return invalid('points: only freehand shapes have points')
    if (w < 0) { x += w; w = -w }
    if (h < 0) { y += h; h = -h }
  }
  const shape: Shape = {
    id: p.id ?? nanoid(12),
    type: p.type,
    x: clamp(x, -LIMITS.maxCoord, LIMITS.maxCoord),
    y: clamp(y, -LIMITS.maxCoord, LIMITS.maxCoord),
    w: clamp(w, 0, LIMITS.maxSize),
    h: clamp(h, 0, LIMITS.maxSize),
    rotation: 0,
    stroke: p.stroke,
    fill: p.fill,
    strokeWidth: clamp(p.strokeWidth, LIMITS.minStrokeWidth, LIMITS.maxStrokeWidth),
    createdBy,
  }
  if (points) shape.points = points
  return ok(shape)
}

function writeShape(board: Board, s: Shape): void {
  const m = new Y.Map<unknown>()
  for (const [k, v] of Object.entries(s)) m.set(k, v)
  board.shapes.set(s.id, m)
  board.order.push([s.id])
}

/** Add many shapes in one transaction. All or nothing. */
export function addShapes(doc: Y.Doc, inputs: NewShape[]): Result<Shape[]> {
  const board = getBoard(doc)
  if (board.shapes.size + inputs.length > LIMITS.maxShapes) {
    return overLimit('maxShapes', `board would have ${board.shapes.size + inputs.length} shapes, limit is ${LIMITS.maxShapes}`)
  }
  const prepared: Shape[] = []
  const seen = new Set<string>()
  for (const input of inputs) {
    const r = prepareShape(input, String(doc.clientID))
    if (!r.ok) return r
    if (board.shapes.has(r.value.id) || seen.has(r.value.id)) return invalid(`id: duplicate shape id ${r.value.id}`)
    seen.add(r.value.id)
    prepared.push(r.value)
  }
  if (prepared.length === 0) return ok([])
  doc.transact(() => prepared.forEach((s) => writeShape(board, s)), ORIGIN_LOCAL)
  return ok(prepared)
}

export function addShape(doc: Y.Doc, input: NewShape): Result<Shape> {
  const r = addShapes(doc, [input])
  return r.ok ? ok(r.value[0]) : r
}

function existing(board: Board, ids: readonly string[]): string[] {
  return [...new Set(ids)].filter((id) => board.shapes.has(id))
}

/** Move shapes by a delta. Unknown ids are skipped. Returns how many moved. */
export function moveShapes(doc: Y.Doc, ids: readonly string[], dx: number, dy: number): Result<number> {
  if (!isFiniteNumber(dx) || !isFiniteNumber(dy)) return invalid('delta: dx and dy must be finite numbers')
  const board = getBoard(doc)
  const targets = existing(board, ids).filter((id) => {
    const m = board.shapes.get(id)!
    return isFiniteNumber(m.get('x')) && isFiniteNumber(m.get('y'))
  })
  if (targets.length === 0 || (dx === 0 && dy === 0)) return ok(0)
  doc.transact(() => {
    for (const id of targets) {
      const m = board.shapes.get(id)!
      m.set('x', clamp((m.get('x') as number) + dx, -LIMITS.maxCoord, LIMITS.maxCoord))
      m.set('y', clamp((m.get('y') as number) + dy, -LIMITS.maxCoord, LIMITS.maxCoord))
    }
  }, ORIGIN_LOCAL)
  return ok(targets.length)
}

/** Set stroke, fill or stroke width on shapes. Returns how many changed. */
export function setStyle(doc: Y.Doc, ids: readonly string[], patch: StylePatch): Result<number> {
  const parsed = StylePatchSchema.safeParse(patch)
  if (!parsed.success) return invalid(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))
  const p = parsed.data
  const board = getBoard(doc)
  const targets = existing(board, ids)
  if (targets.length === 0 || Object.keys(p).length === 0) return ok(0)
  doc.transact(() => {
    for (const id of targets) {
      const m = board.shapes.get(id)!
      if (p.stroke !== undefined) m.set('stroke', p.stroke)
      if (p.fill !== undefined) m.set('fill', p.fill)
      if (p.strokeWidth !== undefined) m.set('strokeWidth', clamp(p.strokeWidth, LIMITS.minStrokeWidth, LIMITS.maxStrokeWidth))
    }
  }, ORIGIN_LOCAL)
  return ok(targets.length)
}

/** Delete shapes and their z-order entries. Returns how many were deleted. */
export function deleteShapes(doc: Y.Doc, ids: readonly string[]): Result<number> {
  const board = getBoard(doc)
  const targets = new Set(existing(board, ids))
  if (targets.size === 0) return ok(0)
  doc.transact(() => {
    for (const id of targets) board.shapes.delete(id)
    const order = board.order.toArray()
    for (let i = order.length - 1; i >= 0; i--) if (targets.has(order[i])) board.order.delete(i, 1)
  }, ORIGIN_LOCAL)
  return ok(targets.size)
}
```

- [ ] **Step 5:** `pnpm exec vitest run tests/commands.test.ts` → 9 passed. `pnpm typecheck` → exit 0.

- [ ] **Step 6: commit** `feat(doc): add validated add, move, style and delete commands`

---

### Task 4: Limit property tests (spec invariants 2 and 3)

**Files:** create `tests/commands.property.test.ts`.

```ts
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import * as Y from 'yjs'
import { getBoard } from '../src/doc/board'
import { addShape } from '../src/doc/commands'
import { LIMITS, parseShape } from '../src/doc/schema'
import { makePeer } from './helpers'

const finite = fc.double({ noNaN: true, noDefaultInfinity: true })

describe('command limits (property)', () => {
  it('any stroke over the point limit is a limit error and leaves the doc unchanged', () => {
    fc.assert(
      fc.property(fc.integer({ min: LIMITS.maxPointPairs + 1, max: LIMITS.maxPointPairs * 3 }), finite, (pairs, v) => {
        const doc = makePeer(1)
        addShape(doc, { id: 'seedseedseed', type: 'rect', x: 0, y: 0, w: 1, h: 1 })
        const before = Y.encodeStateAsUpdate(doc)
        const r = addShape(doc, { type: 'freehand', x: 0, y: 0, w: 0, h: 0, points: new Array(pairs * 2).fill(v) })
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.error).toMatchObject({ kind: 'limit', limit: 'maxPointPairs' })
        expect(Y.encodeStateAsUpdate(doc)).toEqual(before)
      }),
      { seed: 42, numRuns: 200 },
    )
  })

  it('any finite geometry is stored within limits', () => {
    fc.assert(
      fc.property(fc.constantFrom('rect', 'ellipse') as fc.Arbitrary<'rect' | 'ellipse'>, finite, finite, finite, finite, finite, (type, x, y, w, h, sw) => {
        const doc = makePeer(1)
        const r = addShape(doc, { type, x, y, w, h, strokeWidth: sw })
        expect(r.ok).toBe(true)
        if (!r.ok) return
        const stored = parseShape(getBoard(doc).shapes.get(r.value.id)!.toJSON())!
        expect(Math.abs(stored.x)).toBeLessThanOrEqual(LIMITS.maxCoord)
        expect(Math.abs(stored.y)).toBeLessThanOrEqual(LIMITS.maxCoord)
        expect(stored.w).toBeGreaterThanOrEqual(0)
        expect(stored.w).toBeLessThanOrEqual(LIMITS.maxSize)
        expect(stored.h).toBeLessThanOrEqual(LIMITS.maxSize)
        expect(stored.strokeWidth).toBeGreaterThanOrEqual(LIMITS.minStrokeWidth)
        expect(stored.strokeWidth).toBeLessThanOrEqual(LIMITS.maxStrokeWidth)
      }),
      { seed: 42, numRuns: 200 },
    )
  })
})
```

- [ ] Run `pnpm exec vitest run tests/commands.property.test.ts` → 2 passed. These pass against Task 3's code; to prove they bite, temporarily change `p.points.length / 2 > LIMITS.maxPointPairs` in `prepareShape` to `p.points.length / 2 > LIMITS.maxPointPairs * 4` and confirm the first property fails with a counterexample, then revert. Note the result in the ledger line.
- [ ] **Commit** `test(doc): property-test point, coordinate and size limits`

---

### Task 5: Architecture lint (spec invariant 1)

**Files:** create `tests/lint.test.ts`.

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, dirname, sep } from 'node:path'
import { parseSync } from 'oxc-parser'

const ROOT = resolve(import.meta.dirname, '..')
const SRC = join(ROOT, 'src')
const ALLOWED_TRANSACT = new Set(['src/doc/commands.ts', 'src/doc/sanitize.ts'])

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(name) ? [p] : []
  })
}

type Node = { type?: string; [k: string]: unknown }

function visit(node: unknown, fn: (n: Node) => void): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) { node.forEach((n) => visit(n, fn)); return }
  const n = node as Node
  if (typeof n.type === 'string') fn(n)
  for (const k of Object.keys(n)) if (k !== 'parent') visit(n[k], fn)
}

/** Every member access named `transact`: a.transact, Y.transact, a['transact']. Returns source offsets. */
export function findTransact(filename: string, code: string): number[] {
  const { program, errors } = parseSync(filename, code)
  if (errors.length) throw new Error(`${filename}: parse error ${errors[0].message}`)
  const hits: number[] = []
  visit(program, (n) => {
    if (n.type !== 'MemberExpression') return
    const p = n.property as Node & { name?: string; value?: unknown }
    if ((p.type === 'Identifier' && p.name === 'transact') || (p.type === 'Literal' && p.value === 'transact')) hits.push(n.start as number)
  })
  return hits
}

/** Relative import specifiers in a file. */
function relativeImports(filename: string, code: string): string[] {
  const { program } = parseSync(filename, code)
  const out: string[] = []
  visit(program, (n) => {
    if ((n.type === 'ImportDeclaration' || n.type === 'ExportNamedDeclaration' || n.type === 'ExportAllDeclaration' || n.type === 'ImportExpression') && n.source) {
      const v = (n.source as { value?: unknown }).value
      if (typeof v === 'string' && v.startsWith('.')) out.push(v)
    }
  })
  return out
}

const rel = (p: string) => relative(ROOT, p).split(sep).join('/')

describe('architecture lint', () => {
  it('the scanner finds all three call forms (self-test)', () => {
    const code = "import * as Y from 'yjs'\nexport function f(doc: Y.Doc) { doc.transact(() => {}); Y.transact(doc, () => {}); const t = doc['transact'] }"
    expect(findTransact('fixture.ts', code)).toHaveLength(3)
  })

  it('only commands.ts and sanitize.ts call transact', () => {
    const files = walk(SRC)
    expect(files.length).toBeGreaterThan(0)
    const offenders = files
      .filter((f) => !ALLOWED_TRANSACT.has(rel(f)))
      .filter((f) => findTransact(f, readFileSync(f, 'utf8')).length > 0)
      .map(rel)
    expect(offenders).toEqual([])
  })

  it('src/crdt-core imports nothing from the rest of src', () => {
    const core = join(SRC, 'crdt-core')
    let files: string[] = []
    try { files = walk(core) } catch { files = [] }
    const leaks = files.flatMap((f) =>
      relativeImports(f, readFileSync(f, 'utf8'))
        .filter((spec) => !resolve(dirname(f), spec).startsWith(core))
        .map((spec) => `${rel(f)} -> ${spec}`),
    )
    expect(leaks).toEqual([])
  })
})
```

- [ ] Run `pnpm exec vitest run tests/lint.test.ts` → 3 passed. Prove it bites: add `doc.transact(() => {})` to `src/doc/board.ts` inside a dummy exported function, confirm the second test fails naming `src/doc/board.ts`, then revert.
- [ ] **Commit** `test: forbid transact outside the command layer and sanitizer`

---

### Task 6: Sanitizer (spec invariant 5)

**Files:** create `src/doc/sanitize.ts`, `tests/sanitize.test.ts`.

- [ ] **Step 1: failing test** `tests/sanitize.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { getBoard } from '../src/doc/board'
import { addShape } from '../src/doc/commands'
import { attachSanitizer, repairShape } from '../src/doc/sanitize'
import { LIMITS } from '../src/doc/schema'
import { TestNetwork, fingerprint, makePeer } from './helpers'

/** Builds an update the way a hostile peer would: raw Yjs writes that skip the command layer. */
function hostileUpdate(id: string, pairs: number): Uint8Array {
  const evil = makePeer(666)
  const m = new Y.Map<unknown>()
  const fields = { id, type: 'freehand', x: 5e7, y: 0, w: 10, h: 10, rotation: 0, stroke: '#1e1e1e', fill: 'transparent', strokeWidth: 2, createdBy: '666', points: new Array(pairs * 2).fill(1) }
  for (const [k, v] of Object.entries(fields)) m.set(k, v)
  getBoard(evil).shapes.set(id, m)
  getBoard(evil).order.push([id])
  return Y.encodeStateAsUpdate(evil)
}

describe('sanitizer', () => {
  it('repairShape truncates, evens out and clamps; returns null when valid', () => {
    expect(repairShape({ x: 1, y: 2, w: 3, h: 4, strokeWidth: 2, points: [0, 0, 1, 1] })).toBeNull()
    const patch = repairShape({ x: 2e6, w: -5, strokeWidth: 100, points: [1, 2, 3] })!
    expect(patch).toEqual({ x: LIMITS.maxCoord, w: 0, strokeWidth: LIMITS.maxStrokeWidth, points: [1, 2] })
    expect(repairShape({ points: new Array(10_000).fill(0) })!.points).toHaveLength(LIMITS.maxPointPairs * 2)
  })

  it('leaves structurally invalid values alone', () => {
    expect(repairShape({ x: 'far', points: ['a', 'b'] })).toBeNull()
  })

  it('a 50,000-pair remote stroke is truncated on every honest peer and they converge', () => {
    const a = makePeer(1)
    const b = makePeer(2)
    attachSanitizer(a)
    attachSanitizer(b)
    const net = new TestNetwork([a, b])
    addShape(a, { id: 'honesthonest', type: 'rect', x: 0, y: 0, w: 5, h: 5 })
    net.deliver()
    const u = hostileUpdate('evilevilevil', 50_000)
    Y.applyUpdate(a, u, 'webrtc')
    Y.applyUpdate(b, u, 'webrtc')
    net.deliver()
    for (const d of [a, b]) {
      const m = getBoard(d).shapes.get('evilevilevil')!
      expect((m.get('points') as number[]).length).toBe(LIMITS.maxPointPairs * 2)
      expect(m.get('x')).toBe(LIMITS.maxCoord)
    }
    expect(fingerprint(a)).toBe(fingerprint(b))
  })

  it('does not run on local transactions', () => {
    const a = makePeer(1)
    let repairs = 0
    attachSanitizer(a, (n) => { repairs += n })
    addShape(a, { type: 'rect', x: 0, y: 0, w: 5, h: 5 })
    expect(repairs).toBe(0)
  })
})
```

- [ ] **Step 2:** run it → fails (module not found).

- [ ] **Step 3: implement** `src/doc/sanitize.ts`

```ts
import * as Y from 'yjs'
import { getBoard, ORIGIN_SANITIZER, type ShapeMap } from './board'
import { LIMITS, clamp } from './schema'

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/**
 * The fields that must change to bring one raw shape back within limits, or null if none.
 * Only clamps and truncates. Structurally invalid values are left alone for the renderer to skip.
 * Deterministic, so every honest peer computes the same repair.
 */
export function repairShape(raw: Record<string, unknown>): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {}
  const fit = (key: string, lo: number, hi: number) => {
    const v = raw[key]
    if (isFiniteNumber(v) && (v < lo || v > hi)) patch[key] = clamp(v, lo, hi)
  }
  fit('x', -LIMITS.maxCoord, LIMITS.maxCoord)
  fit('y', -LIMITS.maxCoord, LIMITS.maxCoord)
  fit('w', 0, LIMITS.maxSize)
  fit('h', 0, LIMITS.maxSize)
  fit('strokeWidth', LIMITS.minStrokeWidth, LIMITS.maxStrokeWidth)
  const pts = raw.points
  if (Array.isArray(pts) && pts.every(isFiniteNumber)) {
    let next = pts.length > LIMITS.maxPointPairs * 2 ? pts.slice(0, LIMITS.maxPointPairs * 2) : pts
    if (next.length % 2 !== 0) next = next.slice(0, next.length - 1)
    if (next.some((v) => v < -LIMITS.maxPointCoord || v > LIMITS.maxPointCoord)) {
      next = next.map((v) => clamp(v, -LIMITS.maxPointCoord, LIMITS.maxPointCoord))
    }
    if (next !== pts) patch.points = next
  }
  return Object.keys(patch).length > 0 ? patch : null
}

/** Ids of shapes a transaction created or changed. */
function touchedShapeIds(tr: Y.Transaction, shapes: Y.Map<ShapeMap>): Set<string> {
  const ids = new Set<string>()
  const root: unknown = shapes
  tr.changed.forEach((keys, type) => {
    if (type === root) {
      keys.forEach((k) => { if (k !== null) ids.add(k) })
    } else if (type.parent === root && type._item?.parentSub) {
      ids.add(type._item.parentSub)
    }
  })
  return ids
}

/**
 * Repair over-limit shapes after every non-local transaction (network or IndexedDB load).
 * Returns a function that detaches the observer.
 */
export function attachSanitizer(doc: Y.Doc, onRepair?: (repaired: number) => void): () => void {
  const { shapes } = getBoard(doc)
  const handler = (tr: Y.Transaction) => {
    if (tr.local) return
    const patches: Array<[ShapeMap, Record<string, unknown>]> = []
    for (const id of touchedShapeIds(tr, shapes)) {
      const m = shapes.get(id)
      if (!(m instanceof Y.Map)) continue
      const patch = repairShape(m.toJSON())
      if (patch) patches.push([m, patch])
    }
    if (patches.length === 0) return
    doc.transact(() => {
      for (const [m, patch] of patches) for (const [k, v] of Object.entries(patch)) m.set(k, v)
    }, ORIGIN_SANITIZER)
    onRepair?.(patches.length)
  }
  doc.on('afterTransaction', handler)
  return () => doc.off('afterTransaction', handler)
}
```

- [ ] **Step 4:** `pnpm exec vitest run tests/sanitize.test.ts` → 4 passed. `pnpm exec vitest run tests/lint.test.ts` → 3 passed. `pnpm typecheck` → exit 0.
- [ ] **Commit** `feat(doc): repair over-limit remote shapes with a deterministic sanitizer`

---

### Task 7: Convergence property test (spec invariant 4)

**Files:** create `tests/convergence.property.test.ts`.

```ts
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import type * as Y from 'yjs'
import { getBoard } from '../src/doc/board'
import { addShape, deleteShapes, moveShapes, setStyle } from '../src/doc/commands'
import { attachSanitizer } from '../src/doc/sanitize'
import { parseShape } from '../src/doc/schema'
import { TestNetwork, fingerprint, makePeer, mulberry32 } from './helpers'

type Op =
  | { kind: 'add'; type: 'rect' | 'ellipse' | 'freehand'; x: number; y: number; w: number; h: number }
  | { kind: 'move'; pick: number; dx: number; dy: number }
  | { kind: 'style'; pick: number; fill: string }
  | { kind: 'delete'; pick: number }

const coord = fc.integer({ min: -2000, max: 2000 })
const op: fc.Arbitrary<Op> = fc.oneof(
  fc.record({ kind: fc.constant('add' as const), type: fc.constantFrom('rect' as const, 'ellipse' as const, 'freehand' as const), x: coord, y: coord, w: coord, h: coord }),
  fc.record({ kind: fc.constant('move' as const), pick: fc.nat(), dx: coord, dy: coord }),
  fc.record({ kind: fc.constant('style' as const), pick: fc.nat(), fill: fc.constantFrom('#ff0000', '#00ff00', 'transparent') }),
  fc.record({ kind: fc.constant('delete' as const), pick: fc.nat() }),
)
const step = fc.record({ peer: fc.integer({ min: 0, max: 2 }), op, deliver: fc.integer({ min: 0, max: 3 }) })

function apply(doc: Y.Doc, o: Op): void {
  const ids = getBoard(doc).order.toArray()
  const pick = (n: number) => (ids.length ? [ids[n % ids.length]] : [])
  if (o.kind === 'add') {
    const points = o.type === 'freehand' ? [o.x, o.y, o.x + o.w, o.y + o.h] : undefined
    addShape(doc, { type: o.type, x: o.x, y: o.y, w: o.w, h: o.h, points })
  } else if (o.kind === 'move') moveShapes(doc, pick(o.pick), o.dx, o.dy)
  else if (o.kind === 'style') setStyle(doc, pick(o.pick), { fill: o.fill })
  else deleteShapes(doc, pick(o.pick))
}

describe('convergence (property)', () => {
  it('three peers converge under shuffled, partial delivery', () => {
    fc.assert(
      fc.property(fc.array(step, { minLength: 1, maxLength: 40 }), fc.integer(), (steps, seed) => {
        const peers = [makePeer(1), makePeer(2), makePeer(3)]
        peers.forEach((p) => attachSanitizer(p))
        const net = new TestNetwork(peers)
        const rand = mulberry32(seed)
        for (const s of steps) {
          apply(peers[s.peer], s.op)
          net.deliver(rand, s.deliver)
        }
        net.deliver(rand)
        const [a, b, c] = peers.map(fingerprint)
        expect(b).toBe(a)
        expect(c).toBe(a)
        for (const p of peers) {
          getBoard(p).shapes.forEach((m) => expect(parseShape(m.toJSON())).not.toBeNull())
        }
      }),
      { seed: 42, numRuns: 100 },
    )
  })
})
```

- [ ] Run `pnpm exec vitest run tests/convergence.property.test.ts` → 1 passed (100 runs, seed 42). Prove it bites: in `TestNetwork.deliver`, temporarily skip delivery to peer index 2 (`if (i !== msg.from && i !== 2)`), confirm a failure, revert.
- [ ] **Commit** `test(doc): prove three peers converge under shuffled delivery`

---

### Task 8: Local-only undo (spec invariant 6)

**Files:** create `src/history/undo.ts`, `tests/undo.test.ts`.

- [ ] **Step 1: failing test** `tests/undo.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { getBoard } from '../src/doc/board'
import { addShape, moveShapes } from '../src/doc/commands'
import { createHistory } from '../src/history/undo'
import { TestNetwork, makePeer, rectInput } from './helpers'

describe('history', () => {
  it('undo reverts only local edits; the peer edit survives', () => {
    const a = makePeer(1)
    const b = makePeer(2)
    const net = new TestNetwork([a, b])
    const history = createHistory(a)
    addShape(a, rectInput('aaaaaaaaaaaa'))
    net.deliver()
    addShape(b, rectInput('bbbbbbbbbbbb'))
    net.deliver()
    expect(history.undo()).toBe(true)
    net.deliver()
    for (const d of [a, b]) expect([...getBoard(d).shapes.keys()]).toEqual(['bbbbbbbbbbbb'])
    expect(history.undo()).toBe(false)
  })

  it('each command is one undo step and redo reapplies it', () => {
    const a = makePeer(1)
    const history = createHistory(a)
    let changes = 0
    history.onChange(() => { changes++ })
    addShape(a, rectInput('cccccccccccc', 0, 0))
    moveShapes(a, ['cccccccccccc'], 10, 0)
    moveShapes(a, ['cccccccccccc'], 10, 0)
    history.undo()
    expect(getBoard(a).shapes.get('cccccccccccc')!.get('x')).toBe(10)
    history.redo()
    expect(getBoard(a).shapes.get('cccccccccccc')!.get('x')).toBe(20)
    expect(history.canUndo()).toBe(true)
    expect(changes).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: implement** `src/history/undo.ts`

```ts
import * as Y from 'yjs'
import { getBoard, ORIGIN_LOCAL } from '../doc/board'

export interface History {
  undo(): boolean
  redo(): boolean
  canUndo(): boolean
  canRedo(): boolean
  onChange(cb: () => void): () => void
  destroy(): void
}

/** Undo and redo for this peer's own commands only. Remote and sanitizer edits are never undone. */
export function createHistory(doc: Y.Doc): History {
  const { shapes, order } = getBoard(doc)
  const um = new Y.UndoManager([shapes, order], { trackedOrigins: new Set([ORIGIN_LOCAL]), captureTimeout: 0 })
  const events = ['stack-item-added', 'stack-item-popped', 'stack-cleared'] as const
  return {
    undo: () => um.undo() !== null,
    redo: () => um.redo() !== null,
    canUndo: () => um.canUndo(),
    canRedo: () => um.canRedo(),
    onChange(cb) {
      events.forEach((e) => um.on(e, cb))
      return () => events.forEach((e) => um.off(e, cb))
    },
    destroy: () => um.destroy(),
  }
}
```

- [ ] **Step 3:** `pnpm exec vitest run tests/undo.test.ts` → 2 passed. `pnpm test` → all pass. `pnpm typecheck` → exit 0.
- [ ] **Commit** `feat(history): undo and redo only this peer's commands`

---

### Task 9: crdt-core room links and persistence

**Files:** create `src/crdt-core/room.ts`, `src/crdt-core/persistence.ts`, `src/crdt-core/index.ts` (partial), `tests/room.test.ts`, `tests/persistence.test.ts`.

- [ ] **Step 1: failing tests** `tests/room.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { createRoomLink, formatRoomHash, parseRoomHash } from '../src/crdt-core'

describe('room links', () => {
  it('creates ids and keys of the right shape that round-trip', () => {
    const link = createRoomLink()
    expect(link.roomId).toMatch(/^[A-Za-z0-9_-]{12}$/)
    expect(link.key).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(parseRoomHash(formatRoomHash(link))).toEqual(link)
  })

  it('never repeats in 1,000 draws', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createRoomLink().roomId))
    expect(ids.size).toBe(1000)
  })

  it('rejects missing or malformed parts', () => {
    expect(parseRoomHash('')).toBeNull()
    expect(parseRoomHash('#room=abc&key=def')).toBeNull()
    expect(parseRoomHash('#room=aaaaaaaaaaaa')).toBeNull()
    expect(parseRoomHash('#room=aaaaaaaaaaa!&key=bbbbbbbbbbbbbbbbbbbbbb')).toBeNull()
    expect(parseRoomHash('#key=bbbbbbbbbbbbbbbbbbbbbb&room=aaaaaaaaaaaa')).toEqual({ roomId: 'aaaaaaaaaaaa', key: 'bbbbbbbbbbbbbbbbbbbbbb' })
  })
})
```

`tests/persistence.test.ts`:

```ts
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { attachPersistence } from '../src/crdt-core'
import { getBoard } from '../src/doc/board'
import { addShape } from '../src/doc/commands'
import { attachSanitizer } from '../src/doc/sanitize'
import { LIMITS } from '../src/doc/schema'
import { rectInput } from './helpers'

const flush = () => new Promise((r) => setTimeout(r, 50))

describe('persistence', () => {
  it('a new doc in the same room loads what the last one stored', async () => {
    const a = new Y.Doc()
    const pa = attachPersistence(a, 'room-persist-1')
    await pa.whenSynced
    addShape(a, rectInput('aaaaaaaaaaaa', 7, 8))
    await flush()
    await pa.destroy()

    const b = new Y.Doc()
    const pb = attachPersistence(b, 'room-persist-1')
    await pb.whenSynced
    expect(getBoard(b).shapes.get('aaaaaaaaaaaa')?.get('x')).toBe(7)
    await pb.destroy()
  })

  it('rooms do not share storage', async () => {
    const c = new Y.Doc()
    const pc = attachPersistence(c, 'room-persist-2')
    await pc.whenSynced
    expect(getBoard(c).shapes.size).toBe(0)
    await pc.destroy()
  })

  it('stored over-limit data is repaired by the sanitizer on load', async () => {
    const raw = new Y.Doc()
    const pr = attachPersistence(raw, 'room-persist-3')
    await pr.whenSynced
    const m = new Y.Map<unknown>()
    m.set('x', 9e9)
    getBoard(raw).shapes.set('zzzzzzzzzzzz', m)
    await flush()
    await pr.destroy()

    const d = new Y.Doc()
    attachSanitizer(d)
    const pd = attachPersistence(d, 'room-persist-3')
    await pd.whenSynced
    expect(getBoard(d).shapes.get('zzzzzzzzzzzz')?.get('x')).toBe(LIMITS.maxCoord)
    await pd.destroy()
  })
})
```

- [ ] **Step 2: implement** `src/crdt-core/room.ts`

```ts
export interface RoomLink {
  roomId: string
  key: string
}

const ROOM_RE = /^[A-Za-z0-9_-]{12}$/
const KEY_RE = /^[A-Za-z0-9_-]{22}$/

function randomToken(bytes: number, length: number): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  let s = ''
  for (const b of buf) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, length)
}

/** A new room: 12-char id (72 bits) and 22-char key (132 bits), base64url. */
export function createRoomLink(): RoomLink {
  return { roomId: randomToken(9, 12), key: randomToken(17, 22) }
}

/** Parse `#room=...&key=...`. Returns null when either part is missing or malformed. */
export function parseRoomHash(hash: string): RoomLink | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const roomId = params.get('room') ?? ''
  const key = params.get('key') ?? ''
  return ROOM_RE.test(roomId) && KEY_RE.test(key) ? { roomId, key } : null
}

export function formatRoomHash(link: RoomLink): string {
  return `#room=${link.roomId}&key=${link.key}`
}
```

`src/crdt-core/persistence.ts`:

```ts
import type * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'

export interface Persistence {
  /** Resolves once everything stored locally has been applied to the doc. */
  whenSynced: Promise<void>
  destroy(): Promise<void>
}

export const dbName = (roomId: string): string => `whiteboard:${roomId}`

export function attachPersistence(doc: Y.Doc, roomId: string): Persistence {
  const idb = new IndexeddbPersistence(dbName(roomId), doc)
  return {
    whenSynced: idb.whenSynced.then(() => undefined),
    destroy: () => idb.destroy(),
  }
}
```

`src/crdt-core/index.ts` for now (Task 10 adds the sync export line):

```ts
export { createRoomLink, parseRoomHash, formatRoomHash, type RoomLink } from './room'
export { attachPersistence, dbName, type Persistence } from './persistence'
```

- [ ] **Step 3:** `pnpm exec vitest run tests/room.test.ts tests/persistence.test.ts` → 6 passed. `pnpm exec vitest run tests/lint.test.ts` → 3 passed (crdt-core imports nothing from the rest of `src`).
- [ ] **Commit** `feat(crdt-core): add room links and indexeddb persistence`

---

### Task 10: crdt-core WebRTC sync wrapper

**Files:** create `src/crdt-core/sync.ts`, `tests/sync.test.ts`; modify `src/crdt-core/index.ts`.

- [ ] **Step 1: failing test** `tests/sync.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { connectRoom, topicFor } from '../src/crdt-core'

describe('sync wrapper', () => {
  it('names the topic per room and starts with zero peers', async () => {
    expect(topicFor('aaaaaaaaaaaa')).toBe('whiteboard-aaaaaaaaaaaa')
    const doc = new Y.Doc()
    const sync = connectRoom(doc, { roomId: 'aaaaaaaaaaaa', key: 'bbbbbbbbbbbbbbbbbbbbbb', signaling: [], iceServers: [] })
    expect(sync.provider.roomName).toBe('whiteboard-aaaaaaaaaaaa')
    expect(sync.peerCount()).toBe(0)
    let calls = 0
    const off = sync.onPeersChange(() => { calls++ })
    off()
    sync.destroy()
    expect(calls).toBe(0)
  })
})
```

- [ ] **Step 2: implement** `src/crdt-core/sync.ts`

```ts
import type * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'

export interface SyncOptions {
  roomId: string
  key: string
  signaling: string[]
  /** Pass [] to disable STUN (tests). Undefined keeps simple-peer's defaults. */
  iceServers?: RTCIceServer[]
}

export interface Sync {
  provider: WebrtcProvider
  /** Remote peers with an open data channel, plus same-browser tabs. */
  peerCount(): number
  onPeersChange(cb: (count: number) => void): () => void
  destroy(): void
}

export const topicFor = (roomId: string): string => `whiteboard-${roomId}`

export function connectRoom(doc: Y.Doc, opts: SyncOptions): Sync {
  const provider = new WebrtcProvider(topicFor(opts.roomId), doc, {
    signaling: opts.signaling,
    password: opts.key,
    peerOpts: opts.iceServers ? { config: { iceServers: opts.iceServers } } : {},
  })
  const peerCount = (): number => {
    const room = provider.room
    if (!room) return 0
    let n = room.bcConns.size
    room.webrtcConns.forEach((conn) => { if (conn.connected) n++ })
    return n
  }
  const listeners = new Set<(count: number) => void>()
  let last = -1
  const check = () => {
    const n = peerCount()
    if (n !== last) { last = n; listeners.forEach((cb) => cb(n)) }
  }
  provider.on('peers', check)
  provider.on('synced', check)
  const timer = setInterval(check, 1000)
  return {
    provider,
    peerCount,
    onPeersChange(cb) { listeners.add(cb); return () => listeners.delete(cb) },
    destroy() { clearInterval(timer); provider.destroy() },
  }
}
```

Final `src/crdt-core/index.ts`:

```ts
export { createRoomLink, parseRoomHash, formatRoomHash, type RoomLink } from './room'
export { attachPersistence, dbName, type Persistence } from './persistence'
export { connectRoom, topicFor, type Sync, type SyncOptions } from './sync'
```

- [ ] **Step 3:** `pnpm exec vitest run tests/sync.test.ts` → 1 passed. `pnpm typecheck` → exit 0.
- [ ] **Commit** `feat(crdt-core): wrap y-webrtc with room password and peer count`

---

### Task 11: Signaling server

**Files:** create `server/signaling.ts`, `tests/signaling.test.ts`.

- [ ] **Step 1: failing test** `tests/signaling.test.ts`

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import { MAX_TOPICS_PER_CONN, startSignaling, type SignalingServer } from '../server/signaling'

let server: SignalingServer
const url = () => `ws://127.0.0.1:${server.port}`

function client(): Promise<{ ws: WebSocket; next: () => Promise<Record<string, unknown>> }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url())
    const inbox: Record<string, unknown>[] = []
    const waiters: Array<(m: Record<string, unknown>) => void> = []
    ws.on('message', (raw) => {
      const m = JSON.parse(String(raw))
      const w = waiters.shift()
      if (w) w(m)
      else inbox.push(m)
    })
    const next = () => new Promise<Record<string, unknown>>((r) => {
      const m = inbox.shift()
      if (m) r(m)
      else waiters.push(r)
    })
    ws.on('open', () => resolve({ ws, next }))
    ws.on('error', reject)
  })
}

const settle = () => new Promise((r) => setTimeout(r, 50))

beforeAll(async () => { server = await startSignaling(0) })
afterAll(async () => { await server.close() })

describe('signaling server', () => {
  it('answers HTTP health checks with okay', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/`)
    expect(await res.text()).toBe('okay')
  })

  it('relays publish to every subscriber of the topic, with a client count', async () => {
    const a = await client()
    const b = await client()
    a.ws.send(JSON.stringify({ type: 'subscribe', topics: ['t1'] }))
    b.ws.send(JSON.stringify({ type: 'subscribe', topics: ['t1'] }))
    await settle()
    a.ws.send(JSON.stringify({ type: 'publish', topic: 't1', data: 'hello' }))
    expect(await b.next()).toEqual({ type: 'publish', topic: 't1', data: 'hello', clients: 2 })
    a.ws.close(); b.ws.close()
  })

  it('does not relay to other topics or after unsubscribe', async () => {
    const a = await client()
    const b = await client()
    b.ws.send(JSON.stringify({ type: 'subscribe', topics: ['t2'] }))
    await settle()
    b.ws.send(JSON.stringify({ type: 'unsubscribe', topics: ['t2'] }))
    a.ws.send(JSON.stringify({ type: 'subscribe', topics: ['t3'] }))
    await settle()
    a.ws.send(JSON.stringify({ type: 'publish', topic: 't2', data: 'x' }))
    b.ws.send(JSON.stringify({ type: 'ping' }))
    expect(await b.next()).toEqual({ type: 'pong' })
    a.ws.close(); b.ws.close()
  })

  it('caps topics per connection and ignores garbage', async () => {
    const a = await client()
    const topics = Array.from({ length: MAX_TOPICS_PER_CONN + 5 }, (_, i) => `cap-${i}`)
    a.ws.send('not json')
    a.ws.send(JSON.stringify({ type: 'subscribe', topics }))
    await settle()
    const b = await client()
    b.ws.send(JSON.stringify({ type: 'publish', topic: `cap-${MAX_TOPICS_PER_CONN + 1}`, data: 'over' }))
    b.ws.send(JSON.stringify({ type: 'publish', topic: 'cap-0', data: 'under' }))
    expect(await a.next()).toMatchObject({ topic: 'cap-0', data: 'under' })
    a.ws.close(); b.ws.close()
  })
})
```

- [ ] **Step 2: implement** `server/signaling.ts`

```ts
/**
 * Stateless signaling server for y-webrtc: topic pub/sub over WebSocket.
 * Based on y-webrtc's bin/server.js (MIT, Kevin Jahns, https://github.com/yjs/y-webrtc).
 * Changes: TypeScript, a message size cap, a per-connection topic cap, a health endpoint, start/stop for tests.
 * It never stores anything and only sees encrypted signaling payloads.
 */
import http from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'

export const MAX_MESSAGE_BYTES = 64 * 1024
export const MAX_TOPICS_PER_CONN = 100
const PING_MS = 30_000

type Msg = { type?: unknown; topics?: unknown; topic?: unknown; [k: string]: unknown }

export interface SignalingServer {
  port: number
  close(): Promise<void>
}

export function startSignaling(port: number): Promise<SignalingServer> {
  const topics = new Map<string, Set<WebSocket>>()
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('okay')
  })
  const wss = new WebSocketServer({ server, maxPayload: MAX_MESSAGE_BYTES })

  const send = (conn: WebSocket, msg: Msg) => {
    if (conn.readyState !== conn.OPEN) return
    try { conn.send(JSON.stringify(msg)) } catch { conn.close() }
  }

  wss.on('connection', (conn) => {
    const mine = new Set<string>()
    let alive = true
    const ping = setInterval(() => {
      if (!alive) { conn.terminate(); return }
      alive = false
      try { conn.ping() } catch { conn.terminate() }
    }, PING_MS)
    conn.on('pong', () => { alive = true })
    conn.on('close', () => {
      clearInterval(ping)
      for (const t of mine) {
        const subs = topics.get(t)
        subs?.delete(conn)
        if (subs && subs.size === 0) topics.delete(t)
      }
      mine.clear()
    })
    conn.on('message', (raw) => {
      let msg: Msg
      try { msg = JSON.parse(String(raw)) } catch { return }
      if (!msg || typeof msg !== 'object') return
      switch (msg.type) {
        case 'subscribe':
          for (const t of Array.isArray(msg.topics) ? msg.topics : []) {
            if (typeof t !== 'string' || mine.size >= MAX_TOPICS_PER_CONN) continue
            if (!topics.has(t)) topics.set(t, new Set())
            topics.get(t)!.add(conn)
            mine.add(t)
          }
          break
        case 'unsubscribe':
          for (const t of Array.isArray(msg.topics) ? msg.topics : []) {
            if (typeof t !== 'string') continue
            topics.get(t)?.delete(conn)
            mine.delete(t)
          }
          break
        case 'publish':
          if (typeof msg.topic === 'string') {
            const receivers = topics.get(msg.topic)
            if (receivers) {
              const out = { ...msg, clients: receivers.size }
              receivers.forEach((r) => send(r, out))
            }
          }
          break
        case 'ping':
          send(conn, { type: 'pong' })
          break
      }
    })
  })

  return new Promise((resolve) => {
    server.listen(port, () => {
      const addr = server.address()
      resolve({
        port: typeof addr === 'object' && addr ? addr.port : port,
        close: () => new Promise<void>((done) => {
          wss.clients.forEach((c) => c.terminate())
          wss.close(() => server.close(() => done()))
        }),
      })
    })
  })
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 5411)
  startSignaling(port).then((s) => console.log(`signaling listening on ${s.port}`))
}
```

- [ ] **Step 3:** `pnpm exec vitest run tests/signaling.test.ts` → 4 passed. Then run it for real:

```bash
PORT=5411 node server/signaling.ts   # prints: signaling listening on 5411
curl -s http://localhost:5411/         # prints: okay
```

Stop the server (Ctrl+C, or kill the process you started) before continuing.

- [ ] **Commit** `feat(server): add stateless y-webrtc signaling server`

---

### Task 12: Camera, geometry and spatial index

**Files:** create `src/render/camera.ts`, `src/render/geometry.ts`, `src/render/spatial.ts`, `tests/render.test.ts`.

- [ ] **Step 1: failing test** `tests/render.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import type { Shape } from '../src/doc/schema'
import { panBy, screenToWorld, viewportBounds, worldToScreen, zoomAt, MAX_ZOOM } from '../src/render/camera'
import { hitShape } from '../src/render/geometry'
import { SpatialIndex } from '../src/render/spatial'

const shape = (id: string, x: number, y: number, extra: Partial<Shape> = {}): Shape => ({
  id, type: 'rect', x, y, w: 10, h: 10, rotation: 0, stroke: '#1e1e1e', fill: 'transparent', strokeWidth: 2, createdBy: '1', ...extra,
})

describe('camera', () => {
  it('screen and world round-trip, pan and zoom keep the anchor fixed', () => {
    const c = { x: 100, y: 50, zoom: 2 }
    const w = screenToWorld(c, 30, 40)
    expect(worldToScreen(c, w.x, w.y)).toEqual({ x: 30, y: 40 })
    expect(panBy(c, 20, 0)).toEqual({ x: 90, y: 50, zoom: 2 })
    const z = zoomAt(c, 30, 40, 1.5)
    const after = screenToWorld(z, 30, 40)
    expect(after.x).toBeCloseTo(w.x)
    expect(after.y).toBeCloseTo(w.y)
    expect(zoomAt(c, 0, 0, 1000).zoom).toBe(MAX_ZOOM)
    expect(viewportBounds(c, 200, 100)).toEqual({ minX: 100, minY: 50, maxX: 200, maxY: 100 })
  })
})

describe('geometry and spatial index', () => {
  it('hits inside rects and ellipses and near strokes only', () => {
    expect(hitShape(shape('a', 0, 0), 5, 5, 0)).toBe(true)
    expect(hitShape(shape('a', 0, 0), 30, 30, 2)).toBe(false)
    const e = shape('e', 0, 0, { type: 'ellipse', w: 20, h: 20 })
    expect(hitShape(e, 10, 10, 0)).toBe(true)
    expect(hitShape(e, 0, 0, 0)).toBe(false)
    const f = shape('f', 0, 0, { type: 'freehand', w: 100, h: 0, points: [0, 0, 100, 0] })
    expect(hitShape(f, 50, 2, 1)).toBe(true)
    expect(hitShape(f, 50, 20, 1)).toBe(false)
  })

  it('finds shapes by bounds and forgets removed ones', () => {
    const idx = new SpatialIndex()
    idx.load([shape('a', 0, 0), shape('b', 500, 500)])
    expect(idx.search({ minX: -5, minY: -5, maxX: 20, maxY: 20 })).toEqual(new Set(['a']))
    idx.upsert(shape('a', 1000, 1000))
    expect(idx.search({ minX: -5, minY: -5, maxX: 20, maxY: 20 }).size).toBe(0)
    idx.remove('b')
    expect(idx.size).toBe(1)
  })
})
```

Run it → fails (modules missing).

- [ ] **Step 2: implement** `src/render/camera.ts`

```ts
import type { Bounds } from '../doc/schema'

/** Screen = (world - (x, y)) * zoom. */
export interface Camera {
  x: number
  y: number
  zoom: number
}

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 8

export const screenToWorld = (c: Camera, sx: number, sy: number) => ({ x: c.x + sx / c.zoom, y: c.y + sy / c.zoom })
export const worldToScreen = (c: Camera, wx: number, wy: number) => ({ x: (wx - c.x) * c.zoom, y: (wy - c.y) * c.zoom })

/** Move the view by a screen-space delta (drag right = content moves right). */
export const panBy = (c: Camera, dx: number, dy: number): Camera => ({ ...c, x: c.x - dx / c.zoom, y: c.y - dy / c.zoom })

/** Zoom by a factor while keeping the world point under (sx, sy) fixed. */
export function zoomAt(c: Camera, sx: number, sy: number, factor: number): Camera {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.zoom * factor))
  const w = screenToWorld(c, sx, sy)
  return { zoom, x: w.x - sx / zoom, y: w.y - sy / zoom }
}

export const viewportBounds = (c: Camera, width: number, height: number): Bounds => ({
  minX: c.x, minY: c.y, maxX: c.x + width / c.zoom, maxY: c.y + height / c.zoom,
})
```

`src/render/geometry.ts`:

```ts
import type { Bounds, Shape } from '../doc/schema'

export const intersects = (a: Bounds, b: Bounds): boolean =>
  a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY

export function normalizeRect(x0: number, y0: number, x1: number, y1: number): Bounds {
  return { minX: Math.min(x0, x1), minY: Math.min(y0, y1), maxX: Math.max(x0, x1), maxY: Math.max(y0, y1) }
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Precise hit test in world units. Rects and ellipses hit anywhere inside; strokes hit near the line. */
export function hitShape(s: Shape, x: number, y: number, tolerance: number): boolean {
  const pad = tolerance + s.strokeWidth / 2
  if (s.type === 'rect') {
    return x >= s.x - pad && x <= s.x + s.w + pad && y >= s.y - pad && y <= s.y + s.h + pad
  }
  if (s.type === 'ellipse') {
    const rx = s.w / 2 + pad, ry = s.h / 2 + pad
    const nx = (x - (s.x + s.w / 2)) / rx, ny = (y - (s.y + s.h / 2)) / ry
    return nx * nx + ny * ny <= 1
  }
  const p = s.points ?? []
  if (p.length === 2) return Math.hypot(x - (s.x + p[0]), y - (s.y + p[1])) <= pad
  for (let i = 0; i + 3 < p.length; i += 2) {
    if (distToSegment(x, y, s.x + p[i], s.y + p[i + 1], s.x + p[i + 2], s.y + p[i + 3]) <= pad) return true
  }
  return false
}
```

`src/render/spatial.ts`:

```ts
import RBush from 'rbush'
import { shapeBounds, type Bounds, type Shape } from '../doc/schema'

interface Entry extends Bounds {
  id: string
}

/** R-tree over shape bounds for viewport culling and hit-test candidates. */
export class SpatialIndex {
  private tree = new RBush<Entry>()
  private byId = new Map<string, Entry>()

  get size(): number {
    return this.byId.size
  }

  load(shapes: Iterable<Shape>): void {
    this.tree.clear()
    this.byId.clear()
    const entries: Entry[] = []
    for (const s of shapes) {
      const e = { ...shapeBounds(s), id: s.id }
      entries.push(e)
      this.byId.set(s.id, e)
    }
    this.tree.load(entries)
  }

  upsert(s: Shape): void {
    this.remove(s.id)
    const e = { ...shapeBounds(s), id: s.id }
    this.byId.set(s.id, e)
    this.tree.insert(e)
  }

  remove(id: string): void {
    const e = this.byId.get(id)
    if (!e) return
    this.tree.remove(e)
    this.byId.delete(id)
  }

  search(b: Bounds): Set<string> {
    return new Set(this.tree.search(b).map((e) => e.id))
  }
}
```

- [ ] **Step 3:** `pnpm exec vitest run tests/render.test.ts` → 3 passed. `pnpm typecheck` → exit 0.
- [ ] **Commit** `feat(render): add camera math, hit testing and an rbush index`

---

### Task 13: Pure scene builder and Canvas2D painter (spec invariant 7)

**Files:** create `src/render/scene.ts`, `src/render/canvas.ts`, `tests/scene.test.ts`.

- [ ] **Step 1: failing test** `tests/scene.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import type { Shape } from '../src/doc/schema'
import { buildScene, zOrdered } from '../src/render/scene'
import { paint, type CanvasLike } from '../src/render/canvas'

const shape = (id: string, x: number, y: number, extra: Partial<Shape> = {}): Shape => ({
  id, type: 'rect', x, y, w: 10, h: 10, rotation: 0, stroke: '#1e1e1e', fill: 'transparent', strokeWidth: 2, createdBy: '1', ...extra,
})

function recorder(): CanvasLike & { calls: string[] } {
  const calls: string[] = []
  const rec = (name: string) => (...args: unknown[]) => { calls.push(`${name}(${args.map((a) => (typeof a === 'number' ? +a.toFixed(3) : JSON.stringify(a))).join(',')})`) }
  return {
    calls,
    setTransform: rec('setTransform'), fillRect: rec('fillRect'), beginPath: rec('beginPath'), rect: rec('rect'), ellipse: rec('ellipse'),
    moveTo: rec('moveTo'), lineTo: rec('lineTo'), stroke: rec('stroke'), fill: rec('fill'), setLineDash: rec('setLineDash'),
    strokeStyle: '', fillStyle: '', lineWidth: 1, lineJoin: 'miter', lineCap: 'butt',
  }
}

describe('scene (invariant 7: pure)', () => {
  const shapes = new Map([['a', shape('a', 0, 0)], ['b', shape('b', 5000, 0)], ['c', shape('c', 5, 5)], ['z', shape('z', 1, 1)]])
  const order = ['c', 'ghost', 'a', 'b', 'a']

  it('z-orders, skips ghosts and duplicates, puts unordered shapes on top by id', () => {
    expect(zOrdered({ shapes, order }).map((s) => s.id)).toEqual(['c', 'a', 'b', 'z'])
  })

  it('same input gives the same render list and inputs are not mutated', () => {
    const frozen = Object.freeze([...order])
    const vp = { minX: 0, minY: 0, maxX: 100, maxY: 100 }
    const first = buildScene({ shapes, order: frozen }, vp)
    const second = buildScene({ shapes, order: frozen }, vp)
    expect(first.map((s) => s.id)).toEqual(['c', 'a', 'z'])
    expect(second).toEqual(first)
    expect(frozen).toEqual(order)
  })

  it('a visible set replaces the bounds test', () => {
    const vp = { minX: 0, minY: 0, maxX: 1, maxY: 1 }
    expect(buildScene({ shapes, order }, vp, new Set(['b'])).map((s) => s.id)).toEqual(['b'])
  })
})

describe('canvas painter', () => {
  it('clears, applies camera and dpr, and draws each shape type', () => {
    const ctx = recorder()
    const items = [shape('a', 0, 0, { fill: '#ff0000' }), shape('e', 0, 0, { type: 'ellipse' }), shape('f', 0, 0, { type: 'freehand', points: [0, 0, 4, 4] })]
    const n = paint(ctx, items, { camera: { x: 10, y: 20, zoom: 2 }, width: 100, height: 50, dpr: 2, background: '#fafaf7', accent: '#2f5bea' })
    expect(n).toBe(3)
    expect(ctx.calls.slice(0, 3)).toEqual(['setTransform(2,0,0,2,0,0)', 'fillRect(0,0,100,50)', 'setTransform(4,0,0,4,-40,-80)'])
    expect(ctx.calls).toContain('rect(0,0,10,10)')
    expect(ctx.calls).toContain('fill()')
    expect(ctx.calls.filter((c) => c === 'fill()')).toHaveLength(1)
    expect(ctx.calls).toContain('ellipse(5,5,5,5,0,0,6.283)')
    expect(ctx.calls).toContain('lineTo(4,4)')
  })

  it('offsets dragged selected shapes and draws the draft and marquee', () => {
    const ctx = recorder()
    const n = paint(ctx, [shape('a', 0, 0)], {
      camera: { x: 0, y: 0, zoom: 1 }, width: 10, height: 10, dpr: 1, background: '#fff', accent: '#00f',
      selected: new Set(['a']), dragOffset: { dx: 7, dy: 3 }, draft: shape('d', 50, 50), marquee: { minX: 0, minY: 0, maxX: 5, maxY: 5 },
    })
    expect(n).toBe(2)
    expect(ctx.calls).toContain('rect(7,3,10,10)')
    expect(ctx.calls).toContain('rect(50,50,10,10)')
    expect(ctx.calls).toContain('rect(0,0,5,5)')
  })
})
```

- [ ] **Step 2: implement** `src/render/scene.ts`

```ts
import { shapeBounds, type Bounds, type Shape } from '../doc/schema'
import { intersects } from './geometry'

export interface SceneInput {
  shapes: ReadonlyMap<string, Shape>
  order: readonly string[]
}

/**
 * Valid shapes bottom to top. Ids in `order` without a valid shape are skipped, duplicates keep
 * their first position, and valid shapes missing from `order` go on top sorted by id.
 */
export function zOrdered(input: SceneInput): Shape[] {
  const out: Shape[] = []
  const seen = new Set<string>()
  for (const id of input.order) {
    if (seen.has(id)) continue
    const s = input.shapes.get(id)
    if (s) { out.push(s); seen.add(id) }
  }
  const rest = [...input.shapes.keys()].filter((id) => !seen.has(id)).sort()
  for (const id of rest) out.push(input.shapes.get(id)!)
  return out
}

/**
 * The render list: z-ordered shapes that overlap the viewport. Pure.
 * `visible` is an optional candidate set from the spatial index; when given it replaces the bounds test.
 */
export function buildScene(input: SceneInput, viewport: Bounds, visible?: ReadonlySet<string>): Shape[] {
  return zOrdered(input).filter((s) => (visible ? visible.has(s.id) : intersects(shapeBounds(s), viewport)))
}
```

`src/render/canvas.ts`:

```ts
import type { Bounds, Shape } from '../doc/schema'
import type { Camera } from './camera'

/** The subset of CanvasRenderingContext2D the painter uses, so tests can pass a recorder. */
export interface CanvasLike {
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void
  fillRect(x: number, y: number, w: number, h: number): void
  beginPath(): void
  rect(x: number, y: number, w: number, h: number): void
  ellipse(x: number, y: number, rx: number, ry: number, rotation: number, start: number, end: number): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  stroke(): void
  fill(): void
  setLineDash(segments: number[]): void
  strokeStyle: unknown
  fillStyle: unknown
  lineWidth: number
  lineJoin: string
  lineCap: string
}

export interface PaintOptions {
  camera: Camera
  width: number
  height: number
  dpr: number
  background: string
  accent: string
  selected?: ReadonlySet<string>
  /** Offset applied to selected shapes while they are being dragged. */
  dragOffset?: { dx: number; dy: number } | null
  /** A shape being drawn that is not in the doc yet. */
  draft?: Shape | null
  marquee?: Bounds | null
}

function tracePath(ctx: CanvasLike, s: Shape, dx: number, dy: number): void {
  const x = s.x + dx, y = s.y + dy
  ctx.beginPath()
  if (s.type === 'rect') ctx.rect(x, y, s.w, s.h)
  else if (s.type === 'ellipse') ctx.ellipse(x + s.w / 2, y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2)
  else {
    const p = s.points ?? []
    ctx.moveTo(x + p[0], y + p[1])
    if (p.length === 2) ctx.lineTo(x + p[0] + 0.01, y + p[1])
    for (let i = 2; i + 1 < p.length; i += 2) ctx.lineTo(x + p[i], y + p[i + 1])
  }
}

function drawShape(ctx: CanvasLike, s: Shape, dx: number, dy: number): void {
  tracePath(ctx, s, dx, dy)
  if (s.fill !== 'transparent' && s.type !== 'freehand') {
    ctx.fillStyle = s.fill
    ctx.fill()
  }
  ctx.strokeStyle = s.stroke
  ctx.lineWidth = s.strokeWidth
  ctx.stroke()
}

function dashedRect(ctx: CanvasLike, x: number, y: number, w: number, h: number, zoom: number): void {
  ctx.setLineDash([4 / zoom, 3 / zoom])
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.stroke()
  ctx.setLineDash([])
}

/** Paint one frame. Returns how many shapes were drawn, including the draft. */
export function paint(ctx: CanvasLike, items: readonly Shape[], o: PaintOptions): number {
  const k = o.dpr * o.camera.zoom
  ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0)
  ctx.fillStyle = o.background
  ctx.fillRect(0, 0, o.width, o.height)
  ctx.setTransform(k, 0, 0, k, -o.camera.x * k, -o.camera.y * k)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.setLineDash([])
  const off = o.dragOffset ?? { dx: 0, dy: 0 }
  let drawn = 0
  for (const s of items) {
    const moving = o.selected?.has(s.id) ?? false
    drawShape(ctx, s, moving ? off.dx : 0, moving ? off.dy : 0)
    drawn++
  }
  if (o.draft) { drawShape(ctx, o.draft, 0, 0); drawn++ }
  ctx.strokeStyle = o.accent
  ctx.lineWidth = 1.5 / o.camera.zoom
  if (o.selected && o.selected.size > 0) {
    const pad = 4 / o.camera.zoom
    for (const s of items) {
      if (!o.selected.has(s.id)) continue
      const p = pad + s.strokeWidth / 2
      dashedRect(ctx, s.x + off.dx - p, s.y + off.dy - p, s.w + p * 2, s.h + p * 2, o.camera.zoom)
    }
  }
  if (o.marquee) {
    const m = o.marquee
    dashedRect(ctx, m.minX, m.minY, m.maxX - m.minX, m.maxY - m.minY, o.camera.zoom)
  }
  return drawn
}
```

- [ ] **Step 3:** `pnpm exec vitest run tests/scene.test.ts` → 5 passed. `pnpm typecheck` → exit 0.
- [ ] **Commit** `feat(render): build a pure render list and paint it with Canvas2D`

---

### Task 14: Board store

**Files:** create `src/render/store.ts`, `tests/store.test.ts`.

- [ ] **Step 1: failing test** `tests/store.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { addShape, addShapes, deleteShapes, moveShapes } from '../src/doc/commands'
import { getBoard } from '../src/doc/board'
import { BoardStore } from '../src/render/store'
import { makePeer, rectInput } from './helpers'

describe('board store', () => {
  it('tracks adds, moves, deletes and invalid raw shapes incrementally', () => {
    const doc = makePeer(1)
    addShape(doc, rectInput('aaaaaaaaaaaa', 0, 0))
    const store = new BoardStore(doc)
    let bumps = 0
    store.subscribe(() => { bumps++ })
    expect(store.shapes.size).toBe(1)
    addShapes(doc, [rectInput('bbbbbbbbbbbb', 100, 100)])
    moveShapes(doc, ['aaaaaaaaaaaa'], 500, 0)
    expect(store.shapes.get('aaaaaaaaaaaa')!.x).toBe(500)
    expect(store.hitTest(505, 5, 1)).toBe('aaaaaaaaaaaa')
    expect(store.hitTest(5, 5, 1)).toBeNull()
    deleteShapes(doc, ['bbbbbbbbbbbb'])
    expect(store.shapes.has('bbbbbbbbbbbb')).toBe(false)
    expect(store.order).toEqual(['aaaaaaaaaaaa'])
    const raw = makePeer(9)
    const m = new Y.Map<unknown>()
    m.set('type', 'hexagon')
    getBoard(raw).shapes.set('badbadbadbad', m)
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(raw), 'net')
    expect(store.invalid.has('badbadbadbad')).toBe(true)
    expect(bumps).toBeGreaterThan(0)
    store.destroy()
  })
})
```

- [ ] **Step 2: implement** `src/render/store.ts`

```ts
import * as Y from 'yjs'
import { getBoard, type Board, type ShapeMap } from '../doc/board'
import { parseShape, type Shape } from '../doc/schema'
import { hitShape } from './geometry'
import { SpatialIndex } from './spatial'

/**
 * A read-only, validated cache of the board for the renderer and the tools.
 * Re-parses only the shapes a transaction touched. Never writes to the doc.
 */
export class BoardStore {
  readonly shapes = new Map<string, Shape>()
  readonly invalid = new Set<string>()
  readonly index = new SpatialIndex()
  order: string[] = []
  version = 0
  private listeners = new Set<() => void>()
  private readonly board: Board

  constructor(doc: Y.Doc) {
    this.board = getBoard(doc)
    this.board.shapes.forEach((m, id) => this.read(id, m, false))
    this.index.load(this.shapes.values())
    this.order = this.board.order.toArray()
    this.board.shapes.observeDeep(this.onShapes)
    this.board.order.observe(this.onOrder)
  }

  private read(id: string, m: ShapeMap | undefined, indexIt: boolean): void {
    const s = m instanceof Y.Map ? parseShape(m.toJSON()) : null
    if (s && s.id === id) {
      this.shapes.set(id, s)
      this.invalid.delete(id)
      if (indexIt) this.index.upsert(s)
      return
    }
    this.shapes.delete(id)
    if (indexIt) this.index.remove(id)
    if (m) this.invalid.add(id)
    else this.invalid.delete(id)
  }

  private onShapes = (events: Array<Y.YEvent<any>>) => {
    const ids = new Set<string>()
    for (const e of events) {
      if (e.path.length === 0) e.changes.keys.forEach((_, key) => ids.add(key))
      else ids.add(String(e.path[0]))
    }
    ids.forEach((id) => this.read(id, this.board.shapes.get(id), true))
    this.bump()
  }

  private onOrder = () => {
    this.order = this.board.order.toArray()
    this.bump()
  }

  private bump(): void {
    this.version++
    this.listeners.forEach((cb) => cb())
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => { this.listeners.delete(cb) }
  }

  /** Topmost valid shape at a world point, or null. */
  hitTest(x: number, y: number, tolerance: number): string | null {
    const candidates = this.index.search({ minX: x - tolerance, minY: y - tolerance, maxX: x + tolerance, maxY: y + tolerance })
    if (candidates.size === 0) return null
    for (let i = this.order.length - 1; i >= 0; i--) {
      const id = this.order[i]
      if (!candidates.has(id)) continue
      const s = this.shapes.get(id)
      if (s && hitShape(s, x, y, tolerance)) return id
    }
    return null
  }

  destroy(): void {
    this.board.shapes.unobserveDeep(this.onShapes)
    this.board.order.unobserve(this.onOrder)
    this.listeners.clear()
  }
}
```

- [ ] **Step 3:** `pnpm exec vitest run tests/store.test.ts` → 1 passed. `pnpm exec vitest run tests/lint.test.ts` → 3 passed.
- [ ] **Commit** `feat(render): cache validated shapes and index them incrementally`

---

### Task 15: Config, frame scheduler and session

**Files:** create `src/app/config.ts`, `src/render/loop.ts`, `src/app/session.ts`, `tests/app.test.ts`.

- [ ] **Step 1: failing test** `tests/app.test.ts`

```ts
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { readConfig } from '../src/app/config'
import { Session } from '../src/app/session'
import { createFrameScheduler } from '../src/render/loop'
import { addShape } from '../src/doc/commands'
import { rectInput } from './helpers'

const room = { roomId: 'aaaaaaaaaaaa', key: 'bbbbbbbbbbbbbbbbbbbbbb' }

describe('config', () => {
  it('defaults signaling from env and reads room, ice and debug from the URL', () => {
    const c = readConfig({ search: '?debug=1&ice=none', hash: '#room=aaaaaaaaaaaa&key=bbbbbbbbbbbbbbbbbbbbbb' }, {})
    expect(c).toEqual({ room, signaling: ['ws://localhost:5411'], iceServers: [], debug: true })
  })

  it('a query override wins over env; non-websocket urls are dropped', () => {
    expect(readConfig({ search: '?signaling=ws://localhost:5415', hash: '' }, { VITE_SIGNALING_URLS: 'ws://a:1,wss://b' }).signaling).toEqual(['ws://localhost:5415'])
    expect(readConfig({ search: '', hash: '' }, { VITE_SIGNALING_URLS: 'ws://a:1, wss://b ,http://evil' }).signaling).toEqual(['ws://a:1', 'wss://b'])
    expect(readConfig({ search: '?signaling=javascript:alert(1)', hash: '' }, {}).signaling).toEqual([])
    expect(readConfig({ search: '', hash: '' }, {}).room).toBeNull()
  })
})

describe('frame scheduler', () => {
  it('coalesces invalidations into one frame', () => {
    const queue: FrameRequestCallback[] = []
    let frames = 0
    const s = createFrameScheduler(() => { frames++ }, (cb) => { queue.push(cb); return queue.length }, () => {})
    s.invalidate(); s.invalidate(); s.invalidate()
    expect(queue).toHaveLength(1)
    queue.shift()!(0)
    expect(frames).toBe(1)
    s.invalidate()
    expect(queue).toHaveLength(1)
  })
})

describe('session', () => {
  it('persists across sessions in the same room', async () => {
    const a = new Session({ room, signaling: [], sync: false })
    await a.ready
    addShape(a.doc, rectInput('cccccccccccc'))
    await new Promise((r) => setTimeout(r, 50))
    await a.destroy()
    const b = new Session({ room, signaling: [], sync: false })
    await b.ready
    expect(b.store.shapes.has('cccccccccccc')).toBe(true)
    expect(b.peerCount()).toBe(0)
    await b.destroy()
  })
})
```

- [ ] **Step 2: implement** `src/app/config.ts`

```ts
import { parseRoomHash, type RoomLink } from '../crdt-core'

export interface AppConfig {
  room: RoomLink | null
  signaling: string[]
  /** [] disables STUN (e2e). Undefined keeps the WebRTC library defaults. */
  iceServers?: RTCIceServer[]
  debug: boolean
}

const WS_URL = /^wss?:\/\/[^\s]+$/

/** Read config from the URL and build-time env. Pure, so it is unit-tested. */
export function readConfig(loc: { search: string; hash: string }, env: { VITE_SIGNALING_URLS?: string }): AppConfig {
  const q = new URLSearchParams(loc.search)
  const fromQuery = q.get('signaling')
  const fromEnv = (env.VITE_SIGNALING_URLS ?? 'ws://localhost:5411').split(',').map((s) => s.trim())
  const signaling = (fromQuery ? [fromQuery] : fromEnv).filter((u) => WS_URL.test(u))
  return {
    room: parseRoomHash(loc.hash),
    signaling,
    iceServers: q.get('ice') === 'none' ? [] : undefined,
    debug: q.get('debug') === '1',
  }
}
```

`src/render/loop.ts`:

```ts
export interface FrameScheduler {
  /** Ask for a repaint on the next animation frame. Many calls in one frame paint once. */
  invalidate(): void
  destroy(): void
}

export function createFrameScheduler(
  frame: () => void,
  raf: (cb: FrameRequestCallback) => number = requestAnimationFrame,
  caf: (id: number) => void = cancelAnimationFrame,
): FrameScheduler {
  let pending: number | null = null
  return {
    invalidate() {
      if (pending !== null) return
      pending = raf(() => { pending = null; frame() })
    },
    destroy() {
      if (pending !== null) caf(pending)
      pending = null
    },
  }
}
```

`src/app/session.ts`:

```ts
import * as Y from 'yjs'
import { attachPersistence, connectRoom, type Persistence, type RoomLink, type Sync } from '../crdt-core'
import { attachSanitizer } from '../doc/sanitize'
import { createHistory, type History } from '../history/undo'
import { BoardStore } from '../render/store'

export interface SessionOptions {
  room: RoomLink
  signaling: string[]
  iceServers?: RTCIceServer[]
  /** Tests can turn either side off. */
  persist?: boolean
  sync?: boolean
}

/** One open board: doc, sanitizer, store, history, IndexedDB, WebRTC. */
export class Session {
  readonly doc = new Y.Doc()
  readonly store: BoardStore
  readonly history: History
  readonly ready: Promise<void>
  repairs = 0
  private readonly persistence: Persistence | null
  private readonly sync: Sync | null
  private readonly detachSanitizer: () => void

  constructor(readonly opts: SessionOptions) {
    this.detachSanitizer = attachSanitizer(this.doc, (n) => { this.repairs += n })
    this.store = new BoardStore(this.doc)
    this.history = createHistory(this.doc)
    this.persistence = opts.persist === false ? null : attachPersistence(this.doc, opts.room.roomId)
    this.ready = this.persistence ? this.persistence.whenSynced : Promise.resolve()
    this.sync = opts.sync === false
      ? null
      : connectRoom(this.doc, { roomId: opts.room.roomId, key: opts.room.key, signaling: opts.signaling, iceServers: opts.iceServers })
  }

  peerCount(): number {
    return this.sync?.peerCount() ?? 0
  }

  onPeersChange(cb: (n: number) => void): () => void {
    return this.sync ? this.sync.onPeersChange(cb) : () => {}
  }

  async destroy(): Promise<void> {
    this.sync?.destroy()
    await this.persistence?.destroy()
    this.history.destroy()
    this.store.destroy()
    this.detachSanitizer()
    this.doc.destroy()
  }
}
```

- [ ] **Step 3:** `pnpm exec vitest run tests/app.test.ts` → 4 passed. `pnpm test` → all pass. `pnpm typecheck` → exit 0.
- [ ] **Commit** `feat(app): read url config and open a board session`

---

### Task 16: Tools

**Files:** create `src/tools/tools.ts`, `tests/tools.test.ts`.

- [ ] **Step 1: failing test** `tests/tools.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { addShape } from '../src/doc/commands'
import { getBoard } from '../src/doc/board'
import { LIMITS } from '../src/doc/schema'
import { BoardStore } from '../src/render/store'
import { EMPTY_PREVIEW, createFreehandTool, createSelectTool, createShapeTool, deleteSelection, type Preview, type ToolHost } from '../src/tools/tools'
import { makePeer, rectInput } from './helpers'

function host() {
  const doc = makePeer(1)
  const store = new BoardStore(doc)
  let selection = new Set<string>()
  const previews: Preview[] = []
  const h: ToolHost = {
    doc, store, pixel: 1,
    style: { stroke: '#1e1e1e', fill: 'transparent', strokeWidth: 2 },
    getSelection: () => selection,
    setSelection: (ids) => { selection = new Set(ids) },
    setPreview: (p) => { previews.push(p) },
  }
  let updates = 0
  doc.on('update', () => { updates++ })
  return { h, doc, store, previews, sel: () => [...selection], updates: () => updates }
}

const at = (x: number, y: number, shift = false) => ({ x, y, shift })

describe('shape tools', () => {
  it('rect: previews while dragging and commits exactly one update on release', () => {
    const t = host()
    const tool = createShapeTool('rect')
    tool.down(at(100, 100), t.h)
    tool.move(at(60, 150), t.h)
    expect(t.previews.at(-1)!.draft).toMatchObject({ type: 'rect', x: 60, y: 100, w: 40, h: 50 })
    expect(t.updates()).toBe(0)
    tool.up(at(60, 150), t.h)
    expect(t.updates()).toBe(1)
    expect(t.previews.at(-1)).toEqual(EMPTY_PREVIEW)
    const [shape] = t.store.shapes.values()
    expect(shape).toMatchObject({ type: 'rect', x: 60, y: 100, w: 40, h: 50 })
    expect(t.sel()).toEqual([shape.id])
  })

  it('a click without a drag creates nothing', () => {
    const t = host()
    const tool = createShapeTool('ellipse')
    tool.down(at(5, 5), t.h)
    tool.up(at(5.5, 5.5), t.h)
    expect(t.store.shapes.size).toBe(0)
  })

  it('freehand: skips sub-pixel moves, caps points, commits relative points', () => {
    const t = host()
    const tool = createFreehandTool()
    tool.down(at(10, 10), t.h)
    tool.move(at(10.2, 10.2), t.h)
    tool.move(at(20, 30), t.h)
    tool.up(at(20, 30), t.h)
    const [s] = t.store.shapes.values()
    expect(s).toMatchObject({ type: 'freehand', x: 10, y: 10, w: 10, h: 20, points: [0, 0, 10, 20] })

    tool.down(at(0, 0), t.h)
    for (let i = 1; i < LIMITS.maxPointPairs + 50; i++) tool.move(at(i * 2, 0), t.h)
    tool.up(at(0, 0), t.h)
    const long = [...t.store.shapes.values()].find((x) => x.id !== s.id)!
    expect(long.points!.length).toBe(LIMITS.maxPointPairs * 2)
  })
})

describe('select tool', () => {
  it('click selects, shift-click toggles, empty click clears', () => {
    const t = host()
    addShape(t.doc, rectInput('aaaaaaaaaaaa', 0, 0))
    addShape(t.doc, rectInput('bbbbbbbbbbbb', 100, 0))
    const tool = createSelectTool()
    tool.down(at(5, 5), t.h); tool.up(at(5, 5), t.h)
    expect(t.sel()).toEqual(['aaaaaaaaaaaa'])
    tool.down(at(105, 5, true), t.h); tool.up(at(105, 5, true), t.h)
    expect(t.sel().sort()).toEqual(['aaaaaaaaaaaa', 'bbbbbbbbbbbb'])
    tool.down(at(500, 500), t.h); tool.up(at(500, 500), t.h)
    expect(t.sel()).toEqual([])
  })

  it('dragging a selection previews an offset and commits one move', () => {
    const t = host()
    addShape(t.doc, rectInput('aaaaaaaaaaaa', 0, 0))
    const before = t.updates()
    const tool = createSelectTool()
    tool.down(at(5, 5), t.h)
    tool.move(at(25, 15), t.h)
    expect(t.previews.at(-1)!.dragOffset).toEqual({ dx: 20, dy: 10 })
    tool.up(at(45, 25), t.h)
    expect(t.updates() - before).toBe(1)
    expect(t.store.shapes.get('aaaaaaaaaaaa')).toMatchObject({ x: 40, y: 20 })
  })

  it('marquee selects shapes that intersect the box; delete removes them', () => {
    const t = host()
    addShape(t.doc, rectInput('aaaaaaaaaaaa', 0, 0))
    addShape(t.doc, rectInput('bbbbbbbbbbbb', 100, 0))
    addShape(t.doc, rectInput('cccccccccccc', 1000, 1000))
    const tool = createSelectTool()
    tool.down(at(-20, -20), t.h)
    tool.move(at(120, 20), t.h)
    expect(t.previews.at(-1)!.marquee).toEqual({ minX: -20, minY: -20, maxX: 120, maxY: 20 })
    tool.up(at(120, 20), t.h)
    expect(t.sel().sort()).toEqual(['aaaaaaaaaaaa', 'bbbbbbbbbbbb'])
    expect(deleteSelection(t.h)).toBe(2)
    expect([...getBoard(t.doc).shapes.keys()]).toEqual(['cccccccccccc'])
  })
})
```

- [ ] **Step 2: implement** `src/tools/tools.ts`

```ts
import type * as Y from 'yjs'
import { addShape, deleteShapes, moveShapes } from '../doc/commands'
import { LIMITS, type Bounds, type Shape } from '../doc/schema'
import { intersects, normalizeRect } from '../render/geometry'
import type { BoardStore } from '../render/store'
import { shapeBounds } from '../doc/schema'

export type ToolName = 'select' | 'rect' | 'ellipse' | 'freehand'

export interface Style {
  stroke: string
  fill: string
  strokeWidth: number
}

export interface Preview {
  draft: Shape | null
  marquee: Bounds | null
  dragOffset: { dx: number; dy: number } | null
}

export const EMPTY_PREVIEW: Preview = { draft: null, marquee: null, dragOffset: null }

/** What a tool may touch. Tools write to the doc only through commands. */
export interface ToolHost {
  doc: Y.Doc
  store: BoardStore
  style: Style
  /** World units per screen pixel, for hit tolerance. */
  pixel: number
  getSelection(): ReadonlySet<string>
  setSelection(ids: Iterable<string>): void
  setPreview(p: Preview): void
}

/** A pointer position in world coordinates. */
export interface PointerInput {
  x: number
  y: number
  shift: boolean
}

export interface Tool {
  down(p: PointerInput, host: ToolHost): void
  move(p: PointerInput, host: ToolHost): void
  up(p: PointerInput, host: ToolHost): void
  cancel(host: ToolHost): void
}

const DRAFT_ID = '__draft_____'

function draftShape(type: Shape['type'], b: Bounds, style: Style, points?: number[]): Shape {
  const s: Shape = {
    id: DRAFT_ID, type, x: b.minX, y: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY, rotation: 0,
    stroke: style.stroke, fill: type === 'freehand' ? 'transparent' : style.fill, strokeWidth: style.strokeWidth, createdBy: '',
  }
  if (points) s.points = points
  return s
}

/** Rectangle and ellipse: drag a box, commit one addShape on release. */
export function createShapeTool(type: 'rect' | 'ellipse'): Tool {
  let start: PointerInput | null = null
  return {
    down(p) { start = p },
    move(p, host) {
      if (!start) return
      host.setPreview({ ...EMPTY_PREVIEW, draft: draftShape(type, normalizeRect(start.x, start.y, p.x, p.y), host.style) })
    },
    up(p, host) {
      if (!start) return
      const b = normalizeRect(start.x, start.y, p.x, p.y)
      start = null
      host.setPreview(EMPTY_PREVIEW)
      if (b.maxX - b.minX < 2 * host.pixel && b.maxY - b.minY < 2 * host.pixel) return
      const r = addShape(host.doc, { type, x: b.minX, y: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY, ...host.style })
      if (r.ok) host.setSelection([r.value.id])
    },
    cancel(host) { start = null; host.setPreview(EMPTY_PREVIEW) },
  }
}

/** Freehand: collect points (at most LIMITS.maxPointPairs, skipping sub-pixel moves), commit on release. */
export function createFreehandTool(): Tool {
  let pts: number[] | null = null
  const preview = (host: ToolHost) => {
    if (!pts) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (let i = 0; i < pts.length; i += 2) {
      minX = Math.min(minX, pts[i]); maxX = Math.max(maxX, pts[i]); minY = Math.min(minY, pts[i + 1]); maxY = Math.max(maxY, pts[i + 1])
    }
    const rel = pts.map((v, i) => (i % 2 === 0 ? v - minX : v - minY))
    host.setPreview({ ...EMPTY_PREVIEW, draft: draftShape('freehand', { minX, minY, maxX, maxY }, host.style, rel) })
  }
  return {
    down(p, host) { pts = [p.x, p.y]; preview(host) },
    move(p, host) {
      if (!pts || pts.length / 2 >= LIMITS.maxPointPairs) return
      const lx = pts[pts.length - 2], ly = pts[pts.length - 1]
      if (Math.hypot(p.x - lx, p.y - ly) < host.pixel) return
      pts.push(p.x, p.y)
      preview(host)
    },
    up(_p, host) {
      const points = pts
      pts = null
      host.setPreview(EMPTY_PREVIEW)
      if (!points) return
      addShape(host.doc, { type: 'freehand', x: 0, y: 0, w: 0, h: 0, points, stroke: host.style.stroke, strokeWidth: host.style.strokeWidth })
    },
    cancel(host) { pts = null; host.setPreview(EMPTY_PREVIEW) },
  }
}

/** Select: click, shift-click, marquee, and drag to move with one moveShapes on release. */
export function createSelectTool(): Tool {
  let mode: 'idle' | 'drag' | 'marquee' = 'idle'
  let start: PointerInput | null = null
  return {
    down(p, host) {
      start = p
      const hit = host.store.hitTest(p.x, p.y, 4 * host.pixel)
      const sel = new Set(host.getSelection())
      if (hit) {
        if (p.shift) { if (sel.has(hit)) sel.delete(hit); else sel.add(hit) }
        else if (!sel.has(hit)) { sel.clear(); sel.add(hit) }
        host.setSelection(sel)
        mode = sel.has(hit) ? 'drag' : 'idle'
      } else {
        if (!p.shift) host.setSelection([])
        mode = 'marquee'
      }
    },
    move(p, host) {
      if (!start) return
      if (mode === 'drag') host.setPreview({ ...EMPTY_PREVIEW, dragOffset: { dx: p.x - start.x, dy: p.y - start.y } })
      else if (mode === 'marquee') host.setPreview({ ...EMPTY_PREVIEW, marquee: normalizeRect(start.x, start.y, p.x, p.y) })
    },
    up(p, host) {
      if (!start) return
      if (mode === 'drag') {
        const dx = p.x - start.x, dy = p.y - start.y
        if (dx !== 0 || dy !== 0) moveShapes(host.doc, [...host.getSelection()], dx, dy)
      } else if (mode === 'marquee') {
        const box = normalizeRect(start.x, start.y, p.x, p.y)
        if (box.maxX - box.minX > host.pixel || box.maxY - box.minY > host.pixel) {
          const ids = [...host.store.index.search(box)].filter((id) => {
            const s = host.store.shapes.get(id)
            return s ? intersects(shapeBounds(s), box) : false
          })
          host.setSelection(p.shift ? [...host.getSelection(), ...ids] : ids)
        }
      }
      mode = 'idle'
      start = null
      host.setPreview(EMPTY_PREVIEW)
    },
    cancel(host) { mode = 'idle'; start = null; host.setPreview(EMPTY_PREVIEW) },
  }
}

/** Delete or Backspace with a selection. */
export function deleteSelection(host: ToolHost): number {
  const ids = [...host.getSelection()]
  if (ids.length === 0) return 0
  const r = deleteShapes(host.doc, ids)
  host.setSelection([])
  return r.ok ? r.value : 0
}

export function createTool(name: ToolName): Tool {
  if (name === 'select') return createSelectTool()
  if (name === 'freehand') return createFreehandTool()
  return createShapeTool(name)
}
```

- [ ] **Step 3:** `pnpm exec vitest run tests/tools.test.ts` → 6 passed. `pnpm test` → 17 files, 54 tests passed. `pnpm typecheck` → exit 0.
- [ ] **Commit** `feat(tools): add select, rectangle, ellipse and freehand tools`

---

### Task 17: Board controller (canvas, input, camera)

**Files:** create `src/app/controller.ts`. No unit test: it is DOM glue, covered by e2e in Tasks 20 and 21. Keep all logic that can be pure in the modules above.

- [ ] **Step 1: implement** `src/app/controller.ts`. Required behavior and API:

```ts
import type { Session } from './session'
import type { ToolName, Style } from '../tools/tools'

export interface ControllerSnapshot {
  tool: ToolName
  selection: readonly string[]
  style: Style
  canUndo: boolean
  canRedo: boolean
  shapes: number
  invalid: number
}

export interface PaintStats { drawn: number; paintMs: number }

export class BoardController {
  constructor(canvas: HTMLCanvasElement, session: Session, colors: { background: string; accent: string })
  subscribe(cb: () => void): () => void      // for useSyncExternalStore
  getSnapshot(): ControllerSnapshot          // same object until something changes
  getStats(): PaintStats                     // read by the debug overlay on an interval
  setTool(name: ToolName): void
  setStyle(patch: Partial<Style>): void      // also calls setStyle(doc, selection, patch) when a selection exists
  undo(): void
  redo(): void
  deleteSelected(): void
  destroy(): void
}
```

Implementation rules:
- Fields: `camera: Camera = { x: 0, y: 0, zoom: 1 }`, `tool: Tool` from `createTool`, `selection: Set<string>`, `preview: Preview = EMPTY_PREVIEW`, `size = { width, height, dpr }`, a `FrameScheduler` from `createFrameScheduler(() => this.frame())`.
- Sizing: a `ResizeObserver` on `canvas.parentElement`. Set `canvas.width = round(width * dpr)`, `canvas.height = round(height * dpr)`, CSS size via `canvas.style.width/height`, then invalidate.
- `frame()`: `vp = viewportBounds(camera, width, height)`, `visible = store.index.search(vp)`, `t0 = performance.now()`, `items = buildScene({ shapes: store.shapes, order: store.order }, vp, visible)`, `drawn = paint(ctx, items, {...})`, `stats = { drawn, paintMs: performance.now() - t0 }`. Then set `canvas.dataset.shapes = String(store.shapes.size)` (e2e reads this).
- Pointer events on the canvas, with `setPointerCapture`. World point = `screenToWorld(camera, e.offsetX, e.offsetY)`. Middle button, or left button while Space is held, pans with `panBy`; otherwise forward `down/move/up` to the tool with `{ x, y, shift: e.shiftKey }`. `pointercancel` calls `tool.cancel`.
- Wheel (`{ passive: false }`, `preventDefault`): with Ctrl or Meta, `zoomAt(camera, e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.01))`; otherwise `panBy(camera, -e.deltaX, -e.deltaY)`.
- Keys on `window`, ignored when the target is an `input`, `textarea` or `[contenteditable]`: `v r o p` set tools, `Delete`/`Backspace` delete the selection via `deleteSelection`, Ctrl/Meta+Z undo, Ctrl/Meta+Shift+Z or Ctrl+Y redo, `Escape` cancels the tool and clears the selection, Space sets a `spaceDown` flag (keyup clears it) and `preventDefault`.
- `ToolHost.pixel = 1 / camera.zoom`. `setSelection` and `setPreview` invalidate; `setSelection` also emits.
- `session.store.subscribe`: drop selected ids that no longer exist in `store.shapes`, invalidate, emit. `session.history.onChange`: emit.
- `destroy()` removes every listener, disconnects the observer, destroys the scheduler.
- The controller never calls `transact`. It writes only through `commands.ts` and the tools.

- [ ] **Step 2:** `pnpm typecheck` → exit 0. `pnpm exec vitest run tests/lint.test.ts` → 3 passed.
- [ ] **Commit** `feat(app): drive the canvas, camera and tools from pointer and keyboard input`

---

### Task 18: UI chrome

Load the `design-taste-frontend` skill first. Direction: a calm, paper-like drawing surface with quiet chrome, like a good notebook. One accent color (cobalt `#2f5bea`) that means "selected or active". No gradients, no glassmorphism, no emoji. Geist Variable for text. Everything must work at 375 px wide.

**Files:** create `src/ui/tokens.css`, `src/ui/app.css`, `src/ui/App.tsx`, `src/ui/TopBar.tsx`, `src/ui/Toolbar.tsx`, `src/ui/DebugOverlay.tsx`, `src/ui/useOnline.ts`; replace `src/main.tsx`; create `public/icon.svg`.

- [ ] **Step 1: `src/main.tsx`** (the Session lives outside React so StrictMode double effects never open two WebRTC rooms):

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import './ui/tokens.css'
import './ui/app.css'
import { createRoomLink, formatRoomHash } from './crdt-core'
import { readConfig } from './app/config'
import { Session } from './app/session'
import { App } from './ui/App'

const config = readConfig(window.location, import.meta.env)
let room = config.room
if (!room) {
  room = createRoomLink()
  history.replaceState(null, '', `${location.pathname}${location.search}${formatRoomHash(room)}`)
}
window.addEventListener('hashchange', () => location.reload())

const session = new Session({ room, signaling: config.signaling, iceServers: config.iceServers })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App session={session} room={room} debug={config.debug} />
  </StrictMode>,
)
```

- [ ] **Step 2: components.** Required structure and test ids (e2e depends on these exact ids and texts):
  - `App`: shows a centered "Opening board" state until `session.ready` resolves, then the board layout: `TopBar`, a full-bleed `<div class="stage">` holding `<canvas data-testid="board">`, the floating `Toolbar`, and `DebugOverlay` when `debug`. Create the `BoardController` in a `useEffect` keyed on the canvas ref; read its snapshot with `useSyncExternalStore`. Colors come from `getComputedStyle(document.documentElement)` (`--paper`, `--accent`).
  - `TopBar`: wordmark "Whiteboard", the first 4 characters of the room id as a muted tag, then on the right: `data-testid="peer-count"` with text exactly `Only you` (0), `1 peer` (1) or `N peers`; `data-testid="net-status"` with text `Online` or `Offline` (from `useOnline`, which listens to `online`/`offline` events and reads `navigator.onLine`); `data-testid="copy-link"` button that copies `location.href` and shows "Copied" for 1.5 s; `data-testid="install"` button only when an install prompt is available (Task 19 wires it; render nothing for now).
  - `Toolbar`: buttons `data-testid="tool-select" | "tool-rect" | "tool-ellipse" | "tool-freehand"` with Phosphor icons `Cursor`, `Square`, `Circle`, `PencilSimple`, `aria-pressed` on the active one, and the shortcut letter as a small hint; five stroke swatches (`#1e1e1e`, `#2f5bea`, `#e03131`, `#2b8a3e`, `#f08c00`) with `aria-label` color names; a fill toggle; `data-testid="undo"` and `data-testid="redo"` (`ArrowCounterClockwise`, `ArrowClockwise`) disabled when not possible. All buttons are real `<button>`s with `aria-label` and a visible focus ring.
  - `DebugOverlay`: polls `controller.getStats()` every 250 ms and shows shapes, invalid, drawn, paint ms (1 decimal), peers.
  - `tokens.css`: `:root` variables `--paper #f6f5f1`, `--ink #1f1f1f`, `--muted #6b6b66`, `--line #e4e2db`, `--surface #ffffff`, `--accent #2f5bea`, radius and spacing scale, and a `prefers-color-scheme: dark` block (`--paper #151513`, `--ink #ecebe6`, `--surface #1e1e1b`, `--line #2c2c28`). The canvas background uses `--paper`.
- [ ] **Step 3: `public/icon.svg`**: a simple 512x512 mark (rounded square in `#1f1f1f` with a single cobalt `#2f5bea` freehand stroke). Plain SVG, no external references.
- [ ] **Step 4: verify by hand with Playwright** (no new test file yet):

```bash
pnpm build                 # expect: typecheck ok, "built in"
pnpm test                  # expect: all pass
```

Start `pnpm signaling` and `pnpm dev`, open `http://localhost:5410/` in Playwright (or the browser tools you have), draw a rectangle with the R tool, take a screenshot at 1280x800 and at 375x812, look at both, fix anything clipped or overlapping. Stop both servers.
- [ ] **Commit** `feat(ui): add top bar, toolbar, debug overlay and board layout`

---

### Task 19: PWA, install button, offline badge

**Files:** modify `vite.config.ts`, `src/main.tsx`, `src/ui/TopBar.tsx`, `src/vite-env.d.ts`; create `src/ui/useInstallPrompt.ts`.

- [ ] **Step 1: `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Whiteboard',
        short_name: 'Whiteboard',
        description: 'An offline-first whiteboard. Shapes sync peer to peer and no server holds your data.',
        theme_color: '#f6f5f1',
        background_color: '#f6f5f1',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/bench/],
      },
    }),
  ],
  server: { port: 5410, strictPort: true },
  preview: { port: 5412, strictPort: true },
})
```

- [ ] **Step 2:** add `/// <reference types="vite-plugin-pwa/client" />` to `src/vite-env.d.ts`; in `src/main.tsx` add `import { registerSW } from 'virtual:pwa-register'` and call `registerSW({ immediate: true })` before rendering.
- [ ] **Step 3: `useInstallPrompt`**: listens for `beforeinstallprompt` (call `preventDefault`, keep the event), exposes `{ canInstall, install }`; `install()` calls `prompt()` and clears the event. `appinstalled` clears it too. TopBar shows `data-testid="install"` ("Install") only when `canInstall`.
- [ ] **Step 4: verify**

```bash
pnpm build                                   # expect: "built in" and PWA lines listing sw.js
ls dist/sw.js dist/manifest.webmanifest      # both exist
pnpm test && pnpm typecheck                  # all pass
```

- [ ] **Commit** `feat(pwa): precache the app shell and offer install`

---

### Task 20: Playwright setup, draw and PWA e2e (spec invariant 10)

**Files:** create `playwright.config.ts`, `e2e/helpers.ts`, `e2e/draw.spec.ts`, `e2e/pwa.spec.ts`.

- [ ] **Step 1: `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 1,
  grepInvert: /@demo/,
  use: { baseURL: 'http://localhost:5412', trace: 'retain-on-failure' },
  webServer: [
    { command: 'pnpm exec vite build && pnpm exec vite preview --port 5412 --strictPort', url: 'http://localhost:5412', timeout: 180_000, reuseExistingServer: false },
    { command: 'node server/signaling.ts', env: { PORT: '5415' }, port: 5415, reuseExistingServer: false },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

- [ ] **Step 2: `e2e/helpers.ts`**

```ts
import { expect, type Page } from '@playwright/test'

export const ROOM = (tag: string) => {
  const id = (tag + 'xxxxxxxxxxxx').slice(0, 12).replace(/[^A-Za-z0-9_-]/g, 'x')
  return `#room=${id}&key=e2ekeye2ekeye2ekeye2ek`
}
export const QUERY = '?signaling=ws://localhost:5415&ice=none'

export async function openBoard(page: Page, hash: string): Promise<void> {
  await page.goto(`/${QUERY}${hash}`)
  await expect(page.getByTestId('board')).toBeVisible()
}

export const shapeCount = (page: Page) => page.getByTestId('board').getAttribute('data-shapes')

/** Drag on the canvas in screen coordinates relative to the canvas. */
export async function drag(page: Page, from: [number, number], to: [number, number]): Promise<void> {
  const box = (await page.getByTestId('board').boundingBox())!
  await page.mouse.move(box.x + from[0], box.y + from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + (from[0] + to[0]) / 2, box.y + (from[1] + to[1]) / 2, { steps: 4 })
  await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 4 })
  await page.mouse.up()
}
```

Each spec must use its own room tag (for example `ROOM('draw' + Date.now())`) so tests never share a room.

- [ ] **Step 3: `e2e/draw.spec.ts`**: open a fresh `/` without a hash and assert the URL gains `#room=` and `&key=`; then in a fresh room: click `tool-rect`, drag (100,100)->(260,200), expect `data-shapes` `1`; press `Control+z` → `0`; `Control+Shift+z` → `1`; click `tool-freehand`, drag → `2`; press `v`, click the rectangle's center, press `Delete` → `1`. Use `expect.poll(() => shapeCount(page)).toBe('1')`.
- [ ] **Step 4: `e2e/pwa.spec.ts`**:

```ts
import { expect, test } from '@playwright/test'
import { openBoard, ROOM } from './helpers'

test('chromium reports no installability errors', async ({ page, context }) => {
  await openBoard(page, ROOM('pwa' + Date.now()))
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  const cdp = await context.newCDPSession(page)
  const { installabilityErrors } = (await cdp.send('Page.getInstallabilityErrors' as never)) as { installabilityErrors: unknown[] }
  expect(installabilityErrors).toEqual([])
  const manifest = await (await page.request.get('/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ name: 'Whiteboard', display: 'standalone', start_url: '/' })
})
```

- [ ] **Step 5:** `pnpm exec playwright install chromium` (no-op if already installed), then `pnpm e2e` → 2 passed (draw, pwa). Make sure no `vite preview` or signaling process is left on 5412/5415 afterwards (`netstat -ano | grep -E ":541[25] "` prints nothing listening).
- [ ] **Commit** `test(e2e): cover drawing, undo, delete and pwa installability`

---

### Task 21: Sync and offline e2e (spec invariants 8 and 9)

**Files:** create `e2e/sync.spec.ts`, `e2e/offline.spec.ts`.

- [ ] **Step 1: `e2e/sync.spec.ts`**: two **separate contexts** (`browser.newContext()` twice), same `ROOM('sync' + Date.now())`. Open both, wait for `peer-count` to read `1 peer` in both (timeout 20 s). Draw a rectangle in A; `expect.poll(() => shapeCount(b), { timeout: 5000 }).toBe('1')`. Draw an ellipse in B; A reaches `2`. Close both contexts.
- [ ] **Step 2: `e2e/offline.spec.ts`**: one context. Open a room, wait for `navigator.serviceWorker.ready`, reload once so the page is controlled (`navigator.serviceWorker.controller !== null`), draw a rectangle (`1`), wait 300 ms for IndexedDB, `context.setOffline(true)`, reload, expect `data-shapes` `1` and `net-status` `Offline`. Then draw a second shape while offline (`2`), reload while still offline, expect `2`.
- [ ] **Step 3:** `pnpm e2e` → 4 passed. Run it twice more to check for flakes; record the three results in the ledger line.
- [ ] **Commit** `test(e2e): sync two browser contexts over webrtc and reload offline`

---

### Task 22: Benchmarks and the headline number

**Files:** create `src/bench/random.ts`, `src/bench/synthetic.ts`, `src/bench/main.ts`, `bench.html`, `bench/node.ts`, `bench/browser.spec.ts`, `bench/report.ts`, `playwright.bench.config.ts`, `tests/synthetic.test.ts`; modify `vite.config.ts`, `tests/helpers.ts`.

- [ ] **Step 1:** move `mulberry32` from `tests/helpers.ts` into `src/bench/random.ts` (same code, exported) and re-export it from `tests/helpers.ts` (`export { mulberry32 } from '../src/bench/random'`).
- [ ] **Step 2: `src/bench/synthetic.ts`**: `syntheticShapes(n: number, world: number, seed: number): NewShape[]`, deterministic from `mulberry32(seed)`: 40% rect, 30% ellipse, 30% freehand with 32 points along a sine wobble; positions uniform in `[0, world)`; sizes 20 to 100; stroke from the five swatches. `tests/synthetic.test.ts`: same seed gives deep-equal output; `addShapes` accepts 10,000 of them; type mix within 5% of the targets.
- [ ] **Step 3: `bench.html`** at the repo root (like `index.html`, body holds `<canvas id="c"></canvas>`, script `/src/bench/main.ts`), and add it to `vite.config.ts`: `build: { rolldownOptions: { input: { main: 'index.html', bench: 'bench.html' } } }` (Vite 8 uses `rolldownOptions`; `rollupOptions` is deprecated).
- [ ] **Step 4: `src/bench/main.ts`** exposes `window.__bench`:
  - `pan({ shapes, frames, zoom }) => Promise<PanResult>`: new `Y.Doc`, `addShapes(doc, syntheticShapes(shapes, 8000, 7))`, `BoardStore`, canvas fixed at 1280x720, dpr 1, camera starts at `(0, 0)` with the given zoom. For each frame: `await` one `requestAnimationFrame`, record the rAF timestamp delta, move the camera by 8 screen px right and 4 down, time `store.index.search` + `buildScene` + `paint` with `performance.now()`. Skip the first 10 frames as warm-up. Return `{ shapes, frames, zoom, paintP50Ms, paintP95Ms, frameP50Ms, frameP95Ms, drawnAvg }` (2 decimals; p95 = sorted[floor(0.95 * n)]).
  - Peer mode when `?mode=peer`: read config with `readConfig`, new `Y.Doc` plus `connectRoom` (no persistence). `peers()` returns the peer count; `send(n, gapMs)` adds `n` rects via `addShape` with ids `bench` + 7-digit index, recording `performance.timeOrigin + performance.now()` per id just before each call; `received()` returns `{ id: time }` recorded in a `shapes.observe` handler for added keys.
- [ ] **Step 5: `bench/node.ts`** (run with tsx) writes `bench/results/node.json`:
  - `moveUpdateBytes`: one rect, then the byte length of the `update` event from `moveShapes(doc, [id], 12.5, 7.25)`.
  - `addRectUpdateBytes`: byte length of the update from one `addShape` rect.
  - `docBytes10k`: `Y.encodeStateAsUpdate(doc).byteLength` after `addShapes` of `syntheticShapes(10000, 8000, 7)`.
  - `convergence`: 3 peers (`attachSanitizer` on each, `TestNetwork`-style delivery written inline, do not import from `tests/`), 1,000 random commands per peer from `mulberry32(42)`, shuffled delivery; report `{ peers: 3, opsPerPeer: 1000, ms, converged }` where `converged` compares canonical fingerprints (copy the `canon` + fingerprint logic into `bench/node.ts`).
  - Print each number on its own line.
- [ ] **Step 6: `playwright.bench.config.ts`**: same `webServer` block as `playwright.config.ts`, `testDir: 'bench'`, `testMatch: 'browser.spec.ts'`, `timeout: 180_000`, `workers: 1`.
- [ ] **Step 7: `bench/browser.spec.ts`** writes `bench/results/browser.json`:
  - `pan10k`: `/bench.html`, `__bench.pan({ shapes: 10000, frames: 300, zoom: 1 })`.
  - `fit10k`: same with `zoom: 0.16` (the whole 8000-unit world in 1280 px, so every shape is visible; the worst case).
  - `peerLatency`: two separate contexts on `/bench.html?mode=peer&signaling=ws://localhost:5415&ice=none#room=<fresh 12 chars>&key=<22 chars>`, wait until both `peers()` are 1, `send(50, 100)` in A, poll B's `received()` until 50 ids, latencies = received - sent per id; report `{ edits: 50, p50Ms, p95Ms }`.
  - `chromium: browser.version()`.
- [ ] **Step 8: `bench/report.ts`** merges both into `bench/results.json` with `machine: { cpu: os.cpus()[0].model, cores: os.cpus().length, os: \`${os.platform()} ${os.release()}\`, node: process.version, chromium }` and `date` (ISO), then prints:

```text
HEADLINE: <pan10k.paintP95Ms> ms p95 paint per frame panning 10,000 shapes (<chromium>, <cpu>)
```

- [ ] **Step 9:** `pnpm test` (all pass), then `pnpm bench`. Expected: the node numbers print, 1 browser test passes, `HEADLINE:` prints, `bench/results.json` exists. Copy the HEADLINE line and the four headline metrics into the ledger line verbatim. If `pan10k.paintP95Ms` is over 16.7, do not tune numbers: record it, and note it for the reviewer.
- [ ] **Commit** `perf: benchmark panning, peer latency, update size and convergence` (commit `bench/results.json`, not `bench/results/`).

---

### Task 23: Docker images

**Files:** create `Dockerfile`, `docker-compose.yml`, `deploy/nginx.conf`, `.dockerignore`.

- [ ] **Step 1: `Dockerfile`**

```dockerfile
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
```

- [ ] **Step 2: `deploy/nginx.conf`**

```nginx
server {
  listen 5413;
  root /usr/share/nginx/html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location = /sw.js {
    add_header Cache-Control "no-cache";
  }
}
```

- [ ] **Step 3: `docker-compose.yml`**

```yaml
name: whiteboard
services:
  app:
    build:
      context: .
      target: app
    container_name: whiteboard-app
    ports:
      - "5413:5413"
  signaling:
    build:
      context: .
      target: signaling
    container_name: whiteboard-signaling
    ports:
      - "5414:5414"
```

`.dockerignore`: `node_modules`, `dist`, `dev-dist`, `test-results`, `playwright-report`, `bench/results`, `.git`, `docs/media`.

- [ ] **Step 4: verify**

```bash
docker compose up -d --build                      # expect: whiteboard-app and whiteboard-signaling Started
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5413/   # 200
curl -s http://localhost:5414/                                      # okay
docker compose down                                                 # both removed
```

Record the three outputs in the ledger line.
- [ ] **Commit** `build: add docker images for the app and the signaling server`

---

### Task 24: CI

**Files:** create `.github/workflows/ci.yml`.

- [ ] **Step 1:**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm e2e
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-traces
          path: test-results/
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose build
```

- [ ] **Step 2: verify**

```bash
docker run --rm --name whiteboard-actionlint -v "$(pwd -W 2>/dev/null || pwd):/repo" -w /repo rhysd/actionlint:1.7.12 -color
```

Expected: no output, exit 0.
- [ ] **Commit** `ci: run typecheck, tests, build, e2e and docker build`

---

### Task 25: Demo GIF, README, DEVDOCS, handoff and final gates

**Files:** create `e2e/demo.spec.ts`, `scripts/demo-gif.ts`, `docs/media/demo.gif`, `README.md`, `docs/DEVDOCS.md`, `docs/handoff.md`.

- [ ] **Step 1: `e2e/demo.spec.ts`** (title contains `@demo`; `playwright.config.ts` has `grepInvert: /@demo/` so the normal e2e run skips it, and the `demo` script passes `--grep-invert @never` to override that): two separate contexts, each `{ viewport: { width: 640, height: 420 }, recordVideo: { dir: 'test-results/demo', size: { width: 640, height: 420 } } }`, same room. Wait for `1 peer`. In A draw a rectangle, in B an ellipse, in A a freehand squiggle, each with `page.mouse` steps of 12 so motion is visible, with 600 ms pauses. Then `context.setOffline(true)` on B, draw in B, wait 800 ms, `setOffline(false)`, wait until A shows the new shape. Close contexts and `saveAs` the videos to `test-results/demo/a.webm` and `test-results/demo/b.webm`.
- [ ] **Step 2: `scripts/demo-gif.ts`**: `spawnSync('docker', ['run', '--rm', '--name', 'whiteboard-ffmpeg', '-v', \`${resolve('test-results/demo')}:/in\`, '-v', \`${resolve('docs/media')}:/out\`, 'jrottenberg/ffmpeg:7.1-alpine', '-y', '-i', '/in/a.webm', '-i', '/in/b.webm', '-filter_complex', '[0:v][1:v]hstack=inputs=2,fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse', '/out/demo.gif'], { stdio: 'inherit' })`, creating `docs/media` first; exit non-zero on failure; print the GIF size. Run `pnpm demo`. Expected: `docs/media/demo.gif` exists and is under 4 MB. Look at a frame of it (read the file as an image) to check both boards are visible. If Docker or the ffmpeg image fails, commit without the GIF, use a Playwright screenshot `docs/media/demo.png` instead, and say so in the README and the ledger.
- [ ] **Step 3: run every gate** and keep the real output for the README and handoff:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
pnpm bench          # refreshes bench/results.json; commit the new file
docker compose up -d --build && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5413/ && curl -s http://localhost:5414/ && docker compose down
docker run --rm --name whiteboard-actionlint -v "$(pwd -W 2>/dev/null || pwd):/repo" -w /repo rhysd/actionlint:1.7.12 -color
```

- [ ] **Step 4: `README.md`**. First line, filled only from `bench/results.json`:
  `**<pan10k.paintP95Ms> ms p95 paint per frame panning 10,000 shapes, offline-first, and no server ever holds your data.**`
  Then: the demo GIF; a one-paragraph pitch; "Try it" (the five quickstart commands); a "Measured" table with every number from `bench/results.json` (pan10k paint and frame p50/p95, fit10k paint p95, peer latency p50/p95, move update bytes, add bytes, 10k doc bytes, convergence ms) plus the machine line and date, and one sentence saying paint time covers JavaScript and Canvas2D submission, not GPU raster (ADR 0004); "How it works" (5 bullets: command layer, sanitizer, CRDT, WebRTC + signaling, PWA); "What I gave up" linking ADRs 0001 to 0008; "Tests" (counts from the real `pnpm test` and `pnpm e2e` output); license MIT with the y-webrtc signaling attribution. No em or en dashes.
- [ ] **Step 5: `docs/DEVDOCS.md`** in this order, plain short sentences: (1) what it is plus the measured headline number; (2) a 5-minute quickstart with exact commands (`pnpm install`, `pnpm signaling`, `pnpm dev`, open `http://localhost:5410/`, open the same URL in a second browser profile); (3) architecture with one mermaid `flowchart` (UI and tools, commands, Y.Doc, sanitizer, store and rbush, scene and painter, y-indexeddb, y-webrtc, signaling, service worker); (4) a project layout table; (5) run, test and benchmark commands with ports; (6) key decisions and what they gave up, linking each ADR; (7) known limits and what's left (the spec's Out list, plus anything the gates exposed).
- [ ] **Step 6: `docs/handoff.md`**: `## 2026-10-04, Claude (Sonnet builder), branch main`, what changed, what's left, how to verify (the gate commands with their real results).
- [ ] **Step 7:** `git status --short` must be clean after the commit. `git log --oneline | head -30` shows one commit per task.
- [ ] **Commit** `docs: add readme with measured numbers, devdocs, demo and handoff`

---

## Gates (the reviewer reruns these)

| # | Command | Pass |
|---|---|---|
| 1 | `pnpm typecheck` | exit 0 |
| 2 | `pnpm test` | all files pass, 0 skipped, includes the two property files |
| 3 | `pnpm build` | exit 0, `dist/sw.js` and `dist/manifest.webmanifest` exist |
| 4 | `pnpm e2e` | draw, pwa, sync, offline pass |
| 5 | `pnpm bench` | `bench/results.json` has `browser.pan10k.paintP95Ms`, `browser.fit10k.paintP95Ms`, `browser.peerLatency.p50Ms`, `node.moveUpdateBytes`, `node.convergence.converged === true` |
| 6 | `docker compose up -d --build` then curl 5413 and 5414, then `docker compose down` | `200` and `okay`, no `whiteboard-*` container left running |
| 7 | actionlint 1.7.12 via Docker | exit 0 |
| 8 | README line 1 | every number matches `bench/results.json` |
| 9 | `git status --short` | empty; no `.env*`, no `node_modules`, no `bench/results/` tracked |
