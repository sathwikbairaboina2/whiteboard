# ADR 0002: Nested Y.Map per shape, an order array, plain point arrays

Date: 2026-10-04. Status: accepted.

## Context
Concurrent edits to different fields of one shape (one peer moves it, another recolors it) must both survive. Updates should be small, because every pointer-up becomes one.

## Decision
- `shapes: Y.Map<Y.Map>` keyed by a 12-character id, plus `order: Y.Array<string>` for z-order.
- Each field is a key of the nested map, so concurrent writes to different keys merge. Concurrent writes to the same key resolve by Yjs client id, deterministically.
- Freehand `points` is a plain `number[]` written once at pointer-up, relative to the shape's `x, y`. A move rewrites only `x` and `y`. The prototype measured 40 to 46 bytes for a one-shape move update.
- No `meta` map in v0.1. A `schemaVersion` key is added the first time the format changes.
- The renderer tolerates ids in `order` that are not in `shapes` (skipped) and shapes missing from `order` (drawn last, sorted by id), because concurrent add and delete can produce both briefly.

## Consequences
- What I gave up: points as a `Y.Array` would let two peers extend one stroke concurrently. Strokes are never co-edited in this app, so a plain array is simpler and smaller.
- What I gave up: tombstones still accumulate for deleted shapes. Doc growth over long sessions is not measured in v0.1.
