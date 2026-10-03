import RBush from 'rbush'
import { shapeBounds, type Bounds, type Shape } from '../doc/schema'

interface Entry extends Bounds {
  id: string
}

/** R-tree over shape bounds for viewport culling and hit-test candidates. */
export class SpatialIndex {
  private tree = new RBush<Entry>()
  private byId = new Map<string, Entry>()

  get size(): number {
    return this.byId.size
  }

  load(shapes: Iterable<Shape>): void {
    this.tree.clear()
    this.byId.clear()
    const entries: Entry[] = []
    for (const s of shapes) {
      const e = { ...shapeBounds(s), id: s.id }
      entries.push(e)
      this.byId.set(s.id, e)
    }
    this.tree.load(entries)
  }

  upsert(s: Shape): void {
    this.remove(s.id)
    const e = { ...shapeBounds(s), id: s.id }
    this.byId.set(s.id, e)
    this.tree.insert(e)
  }

  remove(id: string): void {
    const e = this.byId.get(id)
    if (!e) return
    this.tree.remove(e)
    this.byId.delete(id)
  }

  search(b: Bounds): Set<string> {
    return new Set(this.tree.search(b).map((e) => e.id))
  }
}
