import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { getBoard } from '../src/doc/board'
import { addShape, addShapes, deleteShapes, moveShapes, setStyle } from '../src/doc/commands'
import { LIMITS, parseShape } from '../src/doc/schema'
import { makePeer, rectInput } from './helpers'

describe('commands', () => {
  it('addShape stores a valid shape and appends it to the order', () => {
    const doc = makePeer(1)
    const r = addShape(doc, rectInput('aaaaaaaaaaaa', 5, 6))
    expect(r.ok).toBe(true)
    const { shapes, order } = getBoard(doc)
    expect(order.toArray()).toEqual(['aaaaaaaaaaaa'])
    expect(parseShape(shapes.get('aaaaaaaaaaaa')!.toJSON())).toMatchObject({ x: 5, y: 6, w: 10, h: 10, stroke: '#1e1e1e', fill: 'transparent', strokeWidth: 2, rotation: 0, createdBy: '1' })
  })

  it('normalises negative sizes', () => {
    const doc = makePeer(1)
    const r = addShape(doc, { id: 'bbbbbbbbbbbb', type: 'ellipse', x: 100, y: 100, w: -40, h: -20 })
    expect(r.ok && r.value).toMatchObject({ x: 60, y: 80, w: 40, h: 20 })
  })

  it('stores freehand points relative to their bounding box', () => {
    const doc = makePeer(1)
    const r = addShape(doc, { id: 'cccccccccccc', type: 'freehand', x: 0, y: 0, w: 0, h: 0, points: [10, 20, 30, 5, 15, 25] })
    expect(r.ok && r.value).toMatchObject({ x: 10, y: 5, w: 20, h: 20, points: [0, 15, 20, 0, 5, 20] })
  })

  it('rejects bad colors, odd points and points on rects without writing', () => {
    const doc = makePeer(1)
    const before = Y.encodeStateAsUpdate(doc)
    const bad = [
      { ...rectInput('dddddddddddd'), stroke: 'red' },
      { id: 'eeeeeeeeeeee', type: 'freehand' as const, x: 0, y: 0, w: 0, h: 0, points: [1, 2, 3] },
      { ...rectInput('ffffffffffff'), points: [1, 2] },
      { ...rectInput('gggggggggggg'), x: Number.NaN },
    ]
    for (const input of bad) {
      const r = addShape(doc, input)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.kind).toBe('validation')
    }
    expect(Y.encodeStateAsUpdate(doc)).toEqual(before)
  })

  it('rejects duplicate ids', () => {
    const doc = makePeer(1)
    addShape(doc, rectInput('hhhhhhhhhhhh'))
    const r = addShape(doc, rectInput('hhhhhhhhhhhh'))
    expect(!r.ok && r.error.message).toContain('duplicate')
  })

  it('shape cap: refuses to go past LIMITS.maxShapes', () => {
    const doc = makePeer(1)
    const many = Array.from({ length: LIMITS.maxShapes }, (_, i) => ({ type: 'rect' as const, x: i, y: 0, w: 1, h: 1 }))
    expect(addShapes(doc, many).ok).toBe(true)
    const r = addShape(doc, rectInput('iiiiiiiiiiii'))
    expect(!r.ok && r.error).toMatchObject({ kind: 'limit', limit: 'maxShapes' })
    expect(getBoard(doc).shapes.size).toBe(LIMITS.maxShapes)
  })

  it('moveShapes clamps, skips unknown ids and writes one small update', () => {
    const doc = makePeer(1)
    addShape(doc, rectInput('jjjjjjjjjjjj', 0, 0))
    let bytes = 0
    doc.on('update', (u: Uint8Array) => { bytes = u.byteLength })
    const r = moveShapes(doc, ['jjjjjjjjjjjj', 'missing00000'], 5e6, 3)
    expect(r).toEqual({ ok: true, value: 1 })
    expect(getBoard(doc).shapes.get('jjjjjjjjjjjj')!.get('x')).toBe(LIMITS.maxCoord)
    expect(bytes).toBeGreaterThan(0)
    expect(bytes).toBeLessThan(100)
    expect(moveShapes(doc, ['jjjjjjjjjjjj'], Infinity, 0).ok).toBe(false)
  })

  it('setStyle validates colors and clamps stroke width', () => {
    const doc = makePeer(1)
    addShape(doc, rectInput('kkkkkkkkkkkk'))
    expect(setStyle(doc, ['kkkkkkkkkkkk'], { fill: '#ff0000', strokeWidth: 99 })).toEqual({ ok: true, value: 1 })
    const m = getBoard(doc).shapes.get('kkkkkkkkkkkk')!
    expect([m.get('fill'), m.get('strokeWidth')]).toEqual(['#ff0000', LIMITS.maxStrokeWidth])
    expect(setStyle(doc, ['kkkkkkkkkkkk'], { stroke: 'blue' }).ok).toBe(false)
  })

  it('deleteShapes removes the shape and its order entry', () => {
    const doc = makePeer(1)
    addShapes(doc, [rectInput('llllllllllll'), rectInput('mmmmmmmmmmmm')])
    expect(deleteShapes(doc, ['llllllllllll', 'nope00000000'])).toEqual({ ok: true, value: 1 })
    const { shapes, order } = getBoard(doc)
    expect([...shapes.keys()]).toEqual(['mmmmmmmmmmmm'])
    expect(order.toArray()).toEqual(['mmmmmmmmmmmm'])
  })
})
