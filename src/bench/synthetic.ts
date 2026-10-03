import type { NewShape } from '../doc/schema'
import { mulberry32 } from './random'

const STROKES = ['#1e1e1e', '#2f5bea', '#e03131', '#2b8a3e', '#f08c00']

/**
 * Deterministic synthetic board content: 40% rects, 30% ellipses, 30% freehand strokes with
 * 32 points along a sine wobble. Positions are uniform in [0, world), sizes 20 to 100.
 */
export function syntheticShapes(n: number, world: number, seed: number): NewShape[] {
  const rand = mulberry32(seed)
  const out: NewShape[] = []
  for (let i = 0; i < n; i++) {
    const kind = rand()
    const x = rand() * world
    const y = rand() * world
    const size = 20 + rand() * 80
    const stroke = STROKES[Math.floor(rand() * STROKES.length)]
    if (kind < 0.4) {
      out.push({ type: 'rect', x, y, w: size, h: 20 + rand() * 80, stroke })
    } else if (kind < 0.7) {
      out.push({ type: 'ellipse', x, y, w: size, h: 20 + rand() * 80, stroke })
    } else {
      const points: number[] = []
      for (let k = 0; k < 32; k++) points.push(x + (k / 31) * size, y + Math.sin(k * 0.5) * size * 0.25)
      out.push({ type: 'freehand', x: 0, y: 0, w: 0, h: 0, points, stroke })
    }
  }
  return out
}
