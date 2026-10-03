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
