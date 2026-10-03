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
