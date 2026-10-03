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
