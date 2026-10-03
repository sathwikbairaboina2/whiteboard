# ADR 0003: One command layer for local writes, a sanitizer for remote data

Date: 2026-10-04. Status: accepted.

## Context
A CRDT cannot reject a valid update. A buggy or hostile peer can send a 50,000-point stroke and Yjs will apply it. Local writes, on the other hand, can be validated before they happen.

## Decision
- `src/doc/commands.ts` is the only local write path: `addShape`, `addShapes`, `moveShapes`, `setStyle`, `deleteShapes`. Each validates with Zod (`zod@4.6.5`), clamps numbers, checks limits, and only then runs one `doc.transact(..., 'local')`. Each returns a `Result<T>` with a `validation` or `limit` error and never throws.
- `src/doc/sanitize.ts` runs after every non-local transaction. For the shapes that transaction touched, it truncates over-limit point arrays and clamps out-of-range numbers inside one `transact(..., 'sanitizer')`. Every honest peer computes the same repair, so they converge.
- Structurally invalid shapes are not deleted. The renderer skips them and the debug overlay counts them, because deleting a partly delivered shape could destroy data.
- `tests/lint.test.ts` parses `src/` with `oxc-parser@0.152.0` and fails if any other module calls `transact`. TypeScript 7 ships no JavaScript compiler API (its package exports only `version` and an unstable sync API), so the TypeScript compiler is not used for this scan (checked 2026-10-04).

## Consequences
- What I gave up: the sanitizer repairs after the fact. A hostile peer with the room key can still spam valid updates or delete everything. The room key is the real security boundary (ADR 0005).
- What I gave up: two peers repairing the same shape both write the repaired value, which costs a few bytes of extra history.
