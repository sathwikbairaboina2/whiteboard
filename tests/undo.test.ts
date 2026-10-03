import { describe, expect, it } from 'vitest'
import { getBoard } from '../src/doc/board'
import { addShape, moveShapes } from '../src/doc/commands'
import { createHistory } from '../src/history/undo'
import { TestNetwork, makePeer, rectInput } from './helpers'

describe('history', () => {
  it('undo reverts only local edits; the peer edit survives', () => {
    const a = makePeer(1)
    const b = makePeer(2)
    const net = new TestNetwork([a, b])
    const history = createHistory(a)
    addShape(a, rectInput('aaaaaaaaaaaa'))
    net.deliver()
    addShape(b, rectInput('bbbbbbbbbbbb'))
    net.deliver()
    expect(history.undo()).toBe(true)
    net.deliver()
    for (const d of [a, b]) expect([...getBoard(d).shapes.keys()]).toEqual(['bbbbbbbbbbbb'])
    expect(history.undo()).toBe(false)
  })

  it('each command is one undo step and redo reapplies it', () => {
    const a = makePeer(1)
    const history = createHistory(a)
    let changes = 0
    history.onChange(() => { changes++ })
    addShape(a, rectInput('cccccccccccc', 0, 0))
    moveShapes(a, ['cccccccccccc'], 10, 0)
    moveShapes(a, ['cccccccccccc'], 10, 0)
    history.undo()
    expect(getBoard(a).shapes.get('cccccccccccc')!.get('x')).toBe(10)
    history.redo()
    expect(getBoard(a).shapes.get('cccccccccccc')!.get('x')).toBe(20)
    expect(history.canUndo()).toBe(true)
    expect(changes).toBeGreaterThan(0)
  })
})
