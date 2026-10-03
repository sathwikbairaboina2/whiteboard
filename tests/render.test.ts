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
