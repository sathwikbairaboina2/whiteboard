import * as Y from 'yjs'
import { getBoard, ORIGIN_SANITIZER, type ShapeMap } from './board'
import { LIMITS, clamp } from './schema'

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/**
 * The fields that must change to bring one raw shape back within limits, or null if none.
 * Only clamps and truncates. Structurally invalid values are left alone for the renderer to skip.
 * Deterministic, so every honest peer computes the same repair.
 */
export function repairShape(raw: Record<string, unknown>): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {}
  const fit = (key: string, lo: number, hi: number) => {
    const v = raw[key]
    if (isFiniteNumber(v) && (v < lo || v > hi)) patch[key] = clamp(v, lo, hi)
  }
  fit('x', -LIMITS.maxCoord, LIMITS.maxCoord)
  fit('y', -LIMITS.maxCoord, LIMITS.maxCoord)
  fit('w', 0, LIMITS.maxSize)
  fit('h', 0, LIMITS.maxSize)
  fit('strokeWidth', LIMITS.minStrokeWidth, LIMITS.maxStrokeWidth)
  const pts = raw.points
  if (Array.isArray(pts) && pts.every(isFiniteNumber)) {
    let next = pts.length > LIMITS.maxPointPairs * 2 ? pts.slice(0, LIMITS.maxPointPairs * 2) : pts
    if (next.length % 2 !== 0) next = next.slice(0, next.length - 1)
    if (next.some((v) => v < -LIMITS.maxPointCoord || v > LIMITS.maxPointCoord)) {
      next = next.map((v) => clamp(v, -LIMITS.maxPointCoord, LIMITS.maxPointCoord))
    }
    if (next !== pts) patch.points = next
  }
  return Object.keys(patch).length > 0 ? patch : null
}

/** Ids of shapes a transaction created or changed. */
function touchedShapeIds(tr: Y.Transaction, shapes: Y.Map<ShapeMap>): Set<string> {
  const ids = new Set<string>()
  const root: unknown = shapes
  tr.changed.forEach((keys, type) => {
    if (type === root) {
      keys.forEach((k) => { if (k !== null) ids.add(k) })
    } else if (type.parent === root && type._item?.parentSub) {
      ids.add(type._item.parentSub)
    }
  })
  return ids
}

/**
 * Repair over-limit shapes after every non-local transaction (network or IndexedDB load).
 * Returns a function that detaches the observer.
 */
export function attachSanitizer(doc: Y.Doc, onRepair?: (repaired: number) => void): () => void {
  const { shapes } = getBoard(doc)
  const handler = (tr: Y.Transaction) => {
    if (tr.local) return
    const patches: Array<[ShapeMap, Record<string, unknown>]> = []
    for (const id of touchedShapeIds(tr, shapes)) {
      const m = shapes.get(id)
      if (!(m instanceof Y.Map)) continue
      const patch = repairShape(m.toJSON())
      if (patch) patches.push([m, patch])
    }
    if (patches.length === 0) return
    doc.transact(() => {
      for (const [m, patch] of patches) for (const [k, v] of Object.entries(patch)) m.set(k, v)
    }, ORIGIN_SANITIZER)
    onRepair?.(patches.length)
  }
  doc.on('afterTransaction', handler)
  return () => doc.off('afterTransaction', handler)
}
