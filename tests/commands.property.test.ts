import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import * as Y from 'yjs'
import { getBoard } from '../src/doc/board'
import { addShape } from '../src/doc/commands'
import { LIMITS, parseShape } from '../src/doc/schema'
import { makePeer } from './helpers'

const finite = fc.double({ noNaN: true, noDefaultInfinity: true })

describe('command limits (property)', () => {
  it('any stroke over the point limit is a limit error and leaves the doc unchanged', () => {
    fc.assert(
      fc.property(fc.integer({ min: LIMITS.maxPointPairs + 1, max: LIMITS.maxPointPairs * 3 }), finite, (pairs, v) => {
        const doc = makePeer(1)
        addShape(doc, { id: 'seedseedseed', type: 'rect', x: 0, y: 0, w: 1, h: 1 })
        const before = Y.encodeStateAsUpdate(doc)
        const r = addShape(doc, { type: 'freehand', x: 0, y: 0, w: 0, h: 0, points: new Array(pairs * 2).fill(v) })
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.error).toMatchObject({ kind: 'limit', limit: 'maxPointPairs' })
        expect(Y.encodeStateAsUpdate(doc)).toEqual(before)
      }),
      { seed: 42, numRuns: 200 },
    )
  })

  it('any finite geometry is stored within limits', () => {
    fc.assert(
      fc.property(fc.constantFrom('rect', 'ellipse') as fc.Arbitrary<'rect' | 'ellipse'>, finite, finite, finite, finite, finite, (type, x, y, w, h, sw) => {
        const doc = makePeer(1)
        const r = addShape(doc, { type, x, y, w, h, strokeWidth: sw })
        expect(r.ok).toBe(true)
        if (!r.ok) return
        const stored = parseShape(getBoard(doc).shapes.get(r.value.id)!.toJSON())!
        expect(Math.abs(stored.x)).toBeLessThanOrEqual(LIMITS.maxCoord)
        expect(Math.abs(stored.y)).toBeLessThanOrEqual(LIMITS.maxCoord)
        expect(stored.w).toBeGreaterThanOrEqual(0)
        expect(stored.w).toBeLessThanOrEqual(LIMITS.maxSize)
        expect(stored.h).toBeLessThanOrEqual(LIMITS.maxSize)
        expect(stored.strokeWidth).toBeGreaterThanOrEqual(LIMITS.minStrokeWidth)
        expect(stored.strokeWidth).toBeLessThanOrEqual(LIMITS.maxStrokeWidth)
      }),
      { seed: 42, numRuns: 200 },
    )
  })
})
