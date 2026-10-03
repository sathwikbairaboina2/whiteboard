# ADR 0004: Canvas2D with rbush culling, full repaint of visible shapes

Date: 2026-10-04. Status: accepted.

## Context
The headline is frame paint time while panning a 10,000-shape board. The design planned dirty rectangles plus an R-tree.

## Decision
- Canvas2D, painted outside React by a `requestAnimationFrame` loop that coalesces invalidations.
- `rbush@4.0.1` indexes shape bounds. Each frame queries the viewport and repaints every visible shape. No dirty rectangles.
- The render list is built by a pure function (`src/render/scene.ts`) and painted by `src/render/canvas.ts` against a minimal `CanvasLike` interface, so both are unit-tested without a browser.

## Consequences
- Prototype (2026-10-04, headless Chromium, 1280x720, 10,000 synthetic rect, ellipse and 32-point stroke shapes on an 8000x8000 world): paint p95 1.5 ms with viewport culling, 14 ms without. Culling clears the 16.7 ms budget on its own.
- What I gave up: zoomed all the way out, every shape is visible and culling does nothing. That case is bounded by the no-cull number, not improved by dirty rects. The bench reports the panning case and says so.
- What I gave up: paint time measured with `performance.now()` covers JavaScript and Canvas2D command submission, not GPU rasterization. The bench also reports the requestAnimationFrame interval so a reader can see both.
