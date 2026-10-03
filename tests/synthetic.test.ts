import { describe, expect, it } from 'vitest'
import { syntheticShapes } from '../src/bench/synthetic'
import { addShapes } from '../src/doc/commands'
import { makePeer } from './helpers'

describe('synthetic shapes', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    expect(syntheticShapes(200, 8000, 7)).toEqual(syntheticShapes(200, 8000, 7))
    expect(syntheticShapes(200, 8000, 7)).not.toEqual(syntheticShapes(200, 8000, 8))
  })

  it('addShapes accepts 10,000 of them with the target type mix', () => {
    const shapes = syntheticShapes(10_000, 8000, 7)
    const r = addShapes(makePeer(1), shapes)
    expect(r.ok).toBe(true)
    const share = (t: string) => shapes.filter((s) => s.type === t).length / shapes.length
    expect(Math.abs(share('rect') - 0.4)).toBeLessThan(0.05)
    expect(Math.abs(share('ellipse') - 0.3)).toBeLessThan(0.05)
    expect(Math.abs(share('freehand') - 0.3)).toBeLessThan(0.05)
  })
})
