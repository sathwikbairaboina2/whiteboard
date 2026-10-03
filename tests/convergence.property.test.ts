import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import type * as Y from 'yjs'
import { getBoard } from '../src/doc/board'
import { addShape, deleteShapes, moveShapes, setStyle } from '../src/doc/commands'
import { attachSanitizer } from '../src/doc/sanitize'
import { parseShape } from '../src/doc/schema'
import { TestNetwork, fingerprint, makePeer, mulberry32 } from './helpers'

type Op =
  | { kind: 'add'; type: 'rect' | 'ellipse' | 'freehand'; x: number; y: number; w: number; h: number }
  | { kind: 'move'; pick: number; dx: number; dy: number }
  | { kind: 'style'; pick: number; fill: string }
  | { kind: 'delete'; pick: number }

const coord = fc.integer({ min: -2000, max: 2000 })
const op: fc.Arbitrary<Op> = fc.oneof(
  fc.record({ kind: fc.constant('add' as const), type: fc.constantFrom('rect' as const, 'ellipse' as const, 'freehand' as const), x: coord, y: coord, w: coord, h: coord }),
  fc.record({ kind: fc.constant('move' as const), pick: fc.nat(), dx: coord, dy: coord }),
  fc.record({ kind: fc.constant('style' as const), pick: fc.nat(), fill: fc.constantFrom('#ff0000', '#00ff00', 'transparent') }),
  fc.record({ kind: fc.constant('delete' as const), pick: fc.nat() }),
)
const step = fc.record({ peer: fc.integer({ min: 0, max: 2 }), op, deliver: fc.integer({ min: 0, max: 3 }) })

function apply(doc: Y.Doc, o: Op): void {
  const ids = getBoard(doc).order.toArray()
  const pick = (n: number) => (ids.length ? [ids[n % ids.length]] : [])
  if (o.kind === 'add') {
    const points = o.type === 'freehand' ? [o.x, o.y, o.x + o.w, o.y + o.h] : undefined
    addShape(doc, { type: o.type, x: o.x, y: o.y, w: o.w, h: o.h, points })
  } else if (o.kind === 'move') moveShapes(doc, pick(o.pick), o.dx, o.dy)
  else if (o.kind === 'style') setStyle(doc, pick(o.pick), { fill: o.fill })
  else deleteShapes(doc, pick(o.pick))
}

describe('convergence (property)', () => {
  it('three peers converge under shuffled, partial delivery', () => {
    fc.assert(
      fc.property(fc.array(step, { minLength: 1, maxLength: 40 }), fc.integer(), (steps, seed) => {
        const peers = [makePeer(1), makePeer(2), makePeer(3)]
        peers.forEach((p) => attachSanitizer(p))
        const net = new TestNetwork(peers)
        const rand = mulberry32(seed)
        for (const s of steps) {
          apply(peers[s.peer], s.op)
          net.deliver(rand, s.deliver)
        }
        net.deliver(rand)
        const [a, b, c] = peers.map(fingerprint)
        expect(b).toBe(a)
        expect(c).toBe(a)
        for (const p of peers) {
          getBoard(p).shapes.forEach((m) => expect(parseShape(m.toJSON())).not.toBeNull())
        }
      }),
      { seed: 42, numRuns: 100 },
    )
  })
})
