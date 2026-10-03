import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { addShape, addShapes, deleteShapes, moveShapes } from '../src/doc/commands'
import { getBoard } from '../src/doc/board'
import { BoardStore } from '../src/render/store'
import { makePeer, rectInput } from './helpers'

describe('board store', () => {
  it('tracks adds, moves, deletes and invalid raw shapes incrementally', () => {
    const doc = makePeer(1)
    addShape(doc, rectInput('aaaaaaaaaaaa', 0, 0))
    const store = new BoardStore(doc)
    let bumps = 0
    store.subscribe(() => { bumps++ })
    expect(store.shapes.size).toBe(1)
    addShapes(doc, [rectInput('bbbbbbbbbbbb', 100, 100)])
    moveShapes(doc, ['aaaaaaaaaaaa'], 500, 0)
    expect(store.shapes.get('aaaaaaaaaaaa')!.x).toBe(500)
    expect(store.hitTest(505, 5, 1)).toBe('aaaaaaaaaaaa')
    expect(store.hitTest(5, 5, 1)).toBeNull()
    deleteShapes(doc, ['bbbbbbbbbbbb'])
    expect(store.shapes.has('bbbbbbbbbbbb')).toBe(false)
    expect(store.order).toEqual(['aaaaaaaaaaaa'])
    const raw = makePeer(9)
    const m = new Y.Map<unknown>()
    m.set('type', 'hexagon')
    getBoard(raw).shapes.set('badbadbadbad', m)
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(raw), 'net')
    expect(store.invalid.has('badbadbadbad')).toBe(true)
    expect(bumps).toBeGreaterThan(0)
    store.destroy()
  })
})
