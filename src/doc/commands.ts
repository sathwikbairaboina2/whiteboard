import * as Y from 'yjs'
import { nanoid } from 'nanoid'
import { getBoard, ORIGIN_LOCAL, type Board } from './board'
import { LIMITS, NewShapeSchema, StylePatchSchema, clamp, type LimitName, type NewShape, type Shape, type StylePatch } from './schema'

export type CommandError =
  | { kind: 'validation'; message: string }
  | { kind: 'limit'; message: string; limit: LimitName }

export type Result<T> = { ok: true; value: T } | { ok: false; error: CommandError }

const ok = <T>(value: T): Result<T> => ({ ok: true, value })
const invalid = <T>(message: string): Result<T> => ({ ok: false, error: { kind: 'validation', message } })
const overLimit = <T>(limit: LimitName, message: string): Result<T> => ({ ok: false, error: { kind: 'limit', limit, message } })

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Validate, clamp and normalise one new shape. Pure: never touches the doc. */
export function prepareShape(input: NewShape, createdBy: string): Result<Shape> {
  const parsed = NewShapeSchema.safeParse(input)
  if (!parsed.success) {
    return invalid(parsed.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; '))
  }
  const p = parsed.data
  let { x, y, w, h } = p
  let points: number[] | undefined
  if (p.type === 'freehand') {
    if (!p.points || p.points.length < 2 || p.points.length % 2 !== 0) {
      return invalid('points: freehand needs an even number of values and at least one pair')
    }
    if (p.points.length / 2 > LIMITS.maxPointPairs) {
      return overLimit('maxPointPairs', `stroke has ${p.points.length / 2} point pairs, limit is ${LIMITS.maxPointPairs}`)
    }
    const pts = p.points.map((v) => clamp(v, -LIMITS.maxPointCoord, LIMITS.maxPointCoord))
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (let i = 0; i < pts.length; i += 2) {
      minX = Math.min(minX, pts[i]); maxX = Math.max(maxX, pts[i])
      minY = Math.min(minY, pts[i + 1]); maxY = Math.max(maxY, pts[i + 1])
    }
    points = pts.map((v, i) => (i % 2 === 0 ? v - minX : v - minY))
    x += minX; y += minY; w = maxX - minX; h = maxY - minY
  } else {
    if (p.points !== undefined) return invalid('points: only freehand shapes have points')
    if (w < 0) { x += w; w = -w }
    if (h < 0) { y += h; h = -h }
  }
  const shape: Shape = {
    id: p.id ?? nanoid(12),
    type: p.type,
    x: clamp(x, -LIMITS.maxCoord, LIMITS.maxCoord),
    y: clamp(y, -LIMITS.maxCoord, LIMITS.maxCoord),
    w: clamp(w, 0, LIMITS.maxSize),
    h: clamp(h, 0, LIMITS.maxSize),
    rotation: 0,
    stroke: p.stroke,
    fill: p.fill,
    strokeWidth: clamp(p.strokeWidth, LIMITS.minStrokeWidth, LIMITS.maxStrokeWidth),
    createdBy,
  }
  if (points) shape.points = points
  return ok(shape)
}

function writeShape(board: Board, s: Shape): void {
  const m = new Y.Map<unknown>()
  for (const [k, v] of Object.entries(s)) m.set(k, v)
  board.shapes.set(s.id, m)
  board.order.push([s.id])
}

/** Add many shapes in one transaction. All or nothing. */
export function addShapes(doc: Y.Doc, inputs: NewShape[]): Result<Shape[]> {
  const board = getBoard(doc)
  if (board.shapes.size + inputs.length > LIMITS.maxShapes) {
    return overLimit('maxShapes', `board would have ${board.shapes.size + inputs.length} shapes, limit is ${LIMITS.maxShapes}`)
  }
  const prepared: Shape[] = []
  const seen = new Set<string>()
  for (const input of inputs) {
    const r = prepareShape(input, String(doc.clientID))
    if (!r.ok) return r
    if (board.shapes.has(r.value.id) || seen.has(r.value.id)) return invalid(`id: duplicate shape id ${r.value.id}`)
    seen.add(r.value.id)
    prepared.push(r.value)
  }
  if (prepared.length === 0) return ok([])
  doc.transact(() => prepared.forEach((s) => writeShape(board, s)), ORIGIN_LOCAL)
  return ok(prepared)
}

export function addShape(doc: Y.Doc, input: NewShape): Result<Shape> {
  const r = addShapes(doc, [input])
  return r.ok ? ok(r.value[0]) : r
}

function existing(board: Board, ids: readonly string[]): string[] {
  return [...new Set(ids)].filter((id) => board.shapes.has(id))
}

/** Move shapes by a delta. Unknown ids are skipped. Returns how many moved. */
export function moveShapes(doc: Y.Doc, ids: readonly string[], dx: number, dy: number): Result<number> {
  if (!isFiniteNumber(dx) || !isFiniteNumber(dy)) return invalid('delta: dx and dy must be finite numbers')
  const board = getBoard(doc)
  const targets = existing(board, ids).filter((id) => {
    const m = board.shapes.get(id)!
    return isFiniteNumber(m.get('x')) && isFiniteNumber(m.get('y'))
  })
  if (targets.length === 0 || (dx === 0 && dy === 0)) return ok(0)
  doc.transact(() => {
    for (const id of targets) {
      const m = board.shapes.get(id)!
      m.set('x', clamp((m.get('x') as number) + dx, -LIMITS.maxCoord, LIMITS.maxCoord))
      m.set('y', clamp((m.get('y') as number) + dy, -LIMITS.maxCoord, LIMITS.maxCoord))
    }
  }, ORIGIN_LOCAL)
  return ok(targets.length)
}

/** Set stroke, fill or stroke width on shapes. Returns how many changed. */
export function setStyle(doc: Y.Doc, ids: readonly string[], patch: StylePatch): Result<number> {
  const parsed = StylePatchSchema.safeParse(patch)
  if (!parsed.success) return invalid(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))
  const p = parsed.data
  const board = getBoard(doc)
  const targets = existing(board, ids)
  if (targets.length === 0 || Object.keys(p).length === 0) return ok(0)
  doc.transact(() => {
    for (const id of targets) {
      const m = board.shapes.get(id)!
      if (p.stroke !== undefined) m.set('stroke', p.stroke)
      if (p.fill !== undefined) m.set('fill', p.fill)
      if (p.strokeWidth !== undefined) m.set('strokeWidth', clamp(p.strokeWidth, LIMITS.minStrokeWidth, LIMITS.maxStrokeWidth))
    }
  }, ORIGIN_LOCAL)
  return ok(targets.length)
}

/** Delete shapes and their z-order entries. Returns how many were deleted. */
export function deleteShapes(doc: Y.Doc, ids: readonly string[]): Result<number> {
  const board = getBoard(doc)
  const targets = new Set(existing(board, ids))
  if (targets.size === 0) return ok(0)
  doc.transact(() => {
    for (const id of targets) board.shapes.delete(id)
    const order = board.order.toArray()
    for (let i = order.length - 1; i >= 0; i--) if (targets.has(order[i])) board.order.delete(i, 1)
  }, ORIGIN_LOCAL)
  return ok(targets.size)
}
