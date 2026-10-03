import * as Y from 'yjs'
import { getBoard, type Board, type ShapeMap } from '../doc/board'
import { parseShape, type Shape } from '../doc/schema'
import { hitShape } from './geometry'
import { SpatialIndex } from './spatial'

/**
 * A read-only, validated cache of the board for the renderer and the tools.
 * Re-parses only the shapes a transaction touched. Never writes to the doc.
 */
export class BoardStore {
  readonly shapes = new Map<string, Shape>()
  readonly invalid = new Set<string>()
  readonly index = new SpatialIndex()
  order: string[] = []
  version = 0
  private listeners = new Set<() => void>()
  private readonly board: Board

  constructor(doc: Y.Doc) {
    this.board = getBoard(doc)
    this.board.shapes.forEach((m, id) => this.read(id, m, false))
    this.index.load(this.shapes.values())
    this.order = this.board.order.toArray()
    this.board.shapes.observeDeep(this.onShapes)
    this.board.order.observe(this.onOrder)
  }

  private read(id: string, m: ShapeMap | undefined, indexIt: boolean): void {
    const s = m instanceof Y.Map ? parseShape(m.toJSON()) : null
    if (s && s.id === id) {
      this.shapes.set(id, s)
      this.invalid.delete(id)
      if (indexIt) this.index.upsert(s)
      return
    }
    this.shapes.delete(id)
    if (indexIt) this.index.remove(id)
    if (m) this.invalid.add(id)
    else this.invalid.delete(id)
  }

  private onShapes = (events: Array<Y.YEvent<any>>) => {
    const ids = new Set<string>()
    for (const e of events) {
      if (e.path.length === 0) e.changes.keys.forEach((_, key) => ids.add(key))
      else ids.add(String(e.path[0]))
    }
    ids.forEach((id) => this.read(id, this.board.shapes.get(id), true))
    this.bump()
  }

  private onOrder = () => {
    this.order = this.board.order.toArray()
    this.bump()
  }

  private bump(): void {
    this.version++
    this.listeners.forEach((cb) => cb())
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => { this.listeners.delete(cb) }
  }

  /** Topmost valid shape at a world point, or null. */
  hitTest(x: number, y: number, tolerance: number): string | null {
    const candidates = this.index.search({ minX: x - tolerance, minY: y - tolerance, maxX: x + tolerance, maxY: y + tolerance })
    if (candidates.size === 0) return null
    for (let i = this.order.length - 1; i >= 0; i--) {
      const id = this.order[i]
      if (!candidates.has(id)) continue
      const s = this.shapes.get(id)
      if (s && hitShape(s, x, y, tolerance)) return id
    }
    return null
  }

  destroy(): void {
    this.board.shapes.unobserveDeep(this.onShapes)
    this.board.order.unobserve(this.onOrder)
    this.listeners.clear()
  }
}
