import { describe, expect, it } from 'vitest'
import { parseShape, shapeBounds, type Shape } from '../src/doc/schema'

const base: Shape = { id: 'aaaaaaaaaaaa', type: 'rect', x: 1, y: 2, w: 3, h: 4, rotation: 0, stroke: '#1e1e1e', fill: 'transparent', strokeWidth: 2, createdBy: '1' }

describe('schema', () => {
  it('accepts a valid rect and pads bounds by half the stroke', () => {
    expect(parseShape(base)).toEqual(base)
    expect(shapeBounds(base)).toEqual({ minX: 0, minY: 1, maxX: 5, maxY: 7 })
  })

  it('rejects bad ids, colors, types, non-finite numbers and misplaced points', () => {
    expect(parseShape({ ...base, id: 'short' })).toBeNull()
    expect(parseShape({ ...base, stroke: 'red' })).toBeNull()
    expect(parseShape({ ...base, type: 'hexagon' })).toBeNull()
    expect(parseShape({ ...base, x: Infinity })).toBeNull()
    expect(parseShape({ ...base, points: [1, 2] })).toBeNull()
    expect(parseShape({ ...base, type: 'freehand' })).toBeNull()
    expect(parseShape({ ...base, type: 'freehand', points: [1, 2, 3] })).toBeNull()
    expect(parseShape({ ...base, type: 'freehand', points: [1, 2] })).not.toBeNull()
  })
})
