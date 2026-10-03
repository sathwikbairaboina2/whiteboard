import { describe, expect, it } from 'vitest'
import { addShape } from '../src/doc/commands'
import { getBoard } from '../src/doc/board'
import { LIMITS } from '../src/doc/schema'
import { BoardStore } from '../src/render/store'
import { EMPTY_PREVIEW, createFreehandTool, createSelectTool, createShapeTool, deleteSelection, type Preview, type ToolHost } from '../src/tools/tools'
import { makePeer, rectInput } from './helpers'

function host() {
  const doc = makePeer(1)
  const store = new BoardStore(doc)
  let selection = new Set<string>()
  const previews: Preview[] = []
  const h: ToolHost = {
    doc, store, pixel: 1,
    style: { stroke: '#1e1e1e', fill: 'transparent', strokeWidth: 2 },
    getSelection: () => selection,
    setSelection: (ids) => { selection = new Set(ids) },
    setPreview: (p) => { previews.push(p) },
  }
  let updates = 0
  doc.on('update', () => { updates++ })
  return { h, doc, store, previews, sel: () => [...selection], updates: () => updates }
}

const at = (x: number, y: number, shift = false) => ({ x, y, shift })

describe('shape tools', () => {
  it('rect: previews while dragging and commits exactly one update on release', () => {
    const t = host()
    const tool = createShapeTool('rect')
    tool.down(at(100, 100), t.h)
    tool.move(at(60, 150), t.h)
    expect(t.previews.at(-1)!.draft).toMatchObject({ type: 'rect', x: 60, y: 100, w: 40, h: 50 })
    expect(t.updates()).toBe(0)
    tool.up(at(60, 150), t.h)
    expect(t.updates()).toBe(1)
    expect(t.previews.at(-1)).toEqual(EMPTY_PREVIEW)
    const [shape] = t.store.shapes.values()
    expect(shape).toMatchObject({ type: 'rect', x: 60, y: 100, w: 40, h: 50 })
    expect(t.sel()).toEqual([shape.id])
  })

  it('a click without a drag creates nothing', () => {
    const t = host()
    const tool = createShapeTool('ellipse')
    tool.down(at(5, 5), t.h)
    tool.up(at(5.5, 5.5), t.h)
    expect(t.store.shapes.size).toBe(0)
  })

  it('freehand: skips sub-pixel moves, caps points, commits relative points', () => {
    const t = host()
    const tool = createFreehandTool()
    tool.down(at(10, 10), t.h)
    tool.move(at(10.2, 10.2), t.h)
    tool.move(at(20, 30), t.h)
    tool.up(at(20, 30), t.h)
    const [s] = t.store.shapes.values()
    expect(s).toMatchObject({ type: 'freehand', x: 10, y: 10, w: 10, h: 20, points: [0, 0, 10, 20] })

    tool.down(at(0, 0), t.h)
    for (let i = 1; i < LIMITS.maxPointPairs + 50; i++) tool.move(at(i * 2, 0), t.h)
    tool.up(at(0, 0), t.h)
    const long = [...t.store.shapes.values()].find((x) => x.id !== s.id)!
    expect(long.points!.length).toBe(LIMITS.maxPointPairs * 2)
  })
})

describe('select tool', () => {
  it('click selects, shift-click toggles, empty click clears', () => {
    const t = host()
    addShape(t.doc, rectInput('aaaaaaaaaaaa', 0, 0))
    addShape(t.doc, rectInput('bbbbbbbbbbbb', 100, 0))
    const tool = createSelectTool()
    tool.down(at(5, 5), t.h); tool.up(at(5, 5), t.h)
    expect(t.sel()).toEqual(['aaaaaaaaaaaa'])
    tool.down(at(105, 5, true), t.h); tool.up(at(105, 5, true), t.h)
    expect(t.sel().sort()).toEqual(['aaaaaaaaaaaa', 'bbbbbbbbbbbb'])
    tool.down(at(500, 500), t.h); tool.up(at(500, 500), t.h)
    expect(t.sel()).toEqual([])
  })

  it('dragging a selection previews an offset and commits one move', () => {
    const t = host()
    addShape(t.doc, rectInput('aaaaaaaaaaaa', 0, 0))
    const before = t.updates()
    const tool = createSelectTool()
    tool.down(at(5, 5), t.h)
    tool.move(at(25, 15), t.h)
    expect(t.previews.at(-1)!.dragOffset).toEqual({ dx: 20, dy: 10 })
    tool.up(at(45, 25), t.h)
    expect(t.updates() - before).toBe(1)
    expect(t.store.shapes.get('aaaaaaaaaaaa')).toMatchObject({ x: 40, y: 20 })
  })

  it('marquee selects shapes that intersect the box; delete removes them', () => {
    const t = host()
    addShape(t.doc, rectInput('aaaaaaaaaaaa', 0, 0))
    addShape(t.doc, rectInput('bbbbbbbbbbbb', 100, 0))
    addShape(t.doc, rectInput('cccccccccccc', 1000, 1000))
    const tool = createSelectTool()
    tool.down(at(-20, -20), t.h)
    tool.move(at(120, 20), t.h)
    expect(t.previews.at(-1)!.marquee).toEqual({ minX: -20, minY: -20, maxX: 120, maxY: 20 })
    tool.up(at(120, 20), t.h)
    expect(t.sel().sort()).toEqual(['aaaaaaaaaaaa', 'bbbbbbbbbbbb'])
    expect(deleteSelection(t.h)).toBe(2)
    expect([...getBoard(t.doc).shapes.keys()]).toEqual(['cccccccccccc'])
  })
})
