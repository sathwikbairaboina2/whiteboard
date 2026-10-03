# ADR 0006: Fixed-seed property tests and STUN-free browser tests

Date: 2026-10-04. Status: accepted.

## Context
Convergence and limits are the core correctness claims. Browser tests that depend on public STUN servers flake in CI.

## Decision
- `fast-check@4.10.2` property tests run with `seed: 42` (convergence 100 runs, limits 200 runs). A failing seed is reproducible.
- Peers in unit tests are in-memory `Y.Doc`s joined by a test network helper that can hold, shuffle and deliver updates.
- Convergence compares a canonical fingerprint (sorted state vector, key-sorted shapes JSON, the order array), not raw `encodeStateAsUpdate` bytes, because delete-set and map key order depend on the order each replica received updates.
- Playwright e2e opens the app with `?ice=none` (`iceServers: []`) and `?signaling=ws://localhost:5415`. Two contexts on one machine connect over host candidates (prototype confirmed).
- E2E runs against `vite preview` on port 5412, so the real service worker is tested.

## Consequences
- What I gave up: no random-seed nightly job in v0.1, so new counterexamples are only found when someone changes the seed.
- What I gave up: e2e does not exercise STUN or NAT traversal at all.
