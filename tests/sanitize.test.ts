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
