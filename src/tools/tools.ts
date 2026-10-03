import type * as Y from 'yjs'
import { addShape, deleteShapes, moveShapes } from '../doc/commands'
import { LIMITS, type Bounds, type Shape } from '../doc/schema'
import { intersects, normalizeRect } from '../render/geometry'
import type { BoardStore } from '../render/store'
import { shapeBounds } from '../doc/schema'

export type ToolName = 'select' | 'rect' | 'ellipse' | 'freehand'

export interface Style {
  stroke: string
  fill: string
  strokeWidth: number
}

export interface Preview {
  draft: Shape | null
  marquee: Bounds | null
  dragOffset: { dx: number; dy: number } | null
}

export const EMPTY_PREVIEW: Preview = { draft: null, marquee: null, dragOffset: null }

/** What a tool may touch. Tools write to the doc only through commands. */
export interface ToolHost {
  doc: Y.Doc
  store: BoardStore
  style: Style
  /** World units per screen pixel, for hit tolerance. */
  pixel: number
  getSelection(): ReadonlySet<string>
  setSelection(ids: Iterable<string>): void
  setPreview(p: Preview): void
}

/** A pointer position in world coordinates. */
export interface PointerInput {
  x: number
  y: number
  shift: boolean
}

export interface Tool {
  down(p: PointerInput, host: ToolHost): void
  move(p: PointerInput, host: ToolHost): void
  up(p: PointerInput, host: ToolHost): void
  cancel(host: ToolHost): void
}

const DRAFT_ID = '__draft_____'

function draftShape(type: Shape['type'], b: Bounds, style: Style, points?: number[]): Shape {
  const s: Shape = {
    id: DRAFT_ID, type, x: b.minX, y: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY, rotation: 0,
    stroke: style.stroke, fill: type === 'freehand' ? 'transparent' : style.fill, strokeWidth: style.strokeWidth, createdBy: '',
  }
  if (points) s.points = points
  return s
}

/** Rectangle and ellipse: drag a box, commit one addShape on release. */
export function createShapeTool(type: 'rect' | 'ellipse'): Tool {
  let start: PointerInput | null = null
  return {
    down(p) { start = p },
    move(p, host) {
      if (!start) return
      host.setPreview({ ...EMPTY_PREVIEW, draft: draftShape(type, normalizeRect(start.x, start.y, p.x, p.y), host.style) })
    },
    up(p, host) {
      if (!start) return
      const b = normalizeRect(start.x, start.y, p.x, p.y)
      start = null
      host.setPreview(EMPTY_PREVIEW)
      if (b.maxX - b.minX < 2 * host.pixel && b.maxY - b.minY < 2 * host.pixel) return
      const r = addShape(host.doc, { type, x: b.minX, y: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY, ...host.style })
      if (r.ok) host.setSelection([r.value.id])
    },
    cancel(host) { start = null; host.setPreview(EMPTY_PREVIEW) },
  }
}

/** Freehand: collect points (at most LIMITS.maxPointPairs, skipping sub-pixel moves), commit on release. */
export function createFreehandTool(): Tool {
  let pts: number[] | null = null
  const preview = (host: ToolHost) => {
    if (!pts) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (let i = 0; i < pts.length; i += 2) {
      minX = Math.min(minX, pts[i]); maxX = Math.max(maxX, pts[i]); minY = Math.min(minY, pts[i + 1]); maxY = Math.max(maxY, pts[i + 1])
    }
    const rel = pts.map((v, i) => (i % 2 === 0 ? v - minX : v - minY))
    host.setPreview({ ...EMPTY_PREVIEW, draft: draftShape('freehand', { minX, minY, maxX, maxY }, host.style, rel) })
  }
  return {
    down(p, host) { pts = [p.x, p.y]; preview(host) },
    move(p, host) {
      if (!pts || pts.length / 2 >= LIMITS.maxPointPairs) return
      const lx = pts[pts.length - 2], ly = pts[pts.length - 1]
      if (Math.hypot(p.x - lx, p.y - ly) < host.pixel) return
      pts.push(p.x, p.y)
      preview(host)
    },
    up(_p, host) {
      const points = pts
      pts = null
      host.setPreview(EMPTY_PREVIEW)
      if (!points) return
      addShape(host.doc, { type: 'freehand', x: 0, y: 0, w: 0, h: 0, points, stroke: host.style.stroke, strokeWidth: host.style.strokeWidth })
    },
    cancel(host) { pts = null; host.setPreview(EMPTY_PREVIEW) },
  }
}

/** Select: click, shift-click, marquee, and drag to move with one moveShapes on release. */
export function createSelectTool(): Tool {
  let mode: 'idle' | 'drag' | 'marquee' = 'idle'
  let start: PointerInput | null = null
  return {
    down(p, host) {
      start = p
      const hit = host.store.hitTest(p.x, p.y, 4 * host.pixel)
      const sel = new Set(host.getSelection())
      if (hit) {
        if (p.shift) { if (sel.has(hit)) sel.delete(hit); else sel.add(hit) }
        else if (!sel.has(hit)) { sel.clear(); sel.add(hit) }
        host.setSelection(sel)
        mode = sel.has(hit) ? 'drag' : 'idle'
      } else {
        if (!p.shift) host.setSelection([])
        mode = 'marquee'
      }
    },
    move(p, host) {
      if (!start) return
      if (mode === 'drag') host.setPreview({ ...EMPTY_PREVIEW, dragOffset: { dx: p.x - start.x, dy: p.y - start.y } })
      else if (mode === 'marquee') host.setPreview({ ...EMPTY_PREVIEW, marquee: normalizeRect(start.x, start.y, p.x, p.y) })
    },
    up(p, host) {
      if (!start) return
      if (mode === 'drag') {
        const dx = p.x - start.x, dy = p.y - start.y
        if (dx !== 0 || dy !== 0) moveShapes(host.doc, [...host.getSelection()], dx, dy)
      } else if (mode === 'marquee') {
        const box = normalizeRect(start.x, start.y, p.x, p.y)
        if (box.maxX - box.minX > host.pixel || box.maxY - box.minY > host.pixel) {
          const ids = [...host.store.index.search(box)].filter((id) => {
            const s = host.store.shapes.get(id)
            return s ? intersects(shapeBounds(s), box) : false
          })
          host.setSelection(p.shift ? [...host.getSelection(), ...ids] : ids)
        }
      }
      mode = 'idle'
      start = null
      host.setPreview(EMPTY_PREVIEW)
    },
    cancel(host) { mode = 'idle'; start = null; host.setPreview(EMPTY_PREVIEW) },
  }
}

/** Delete or Backspace with a selection. */
export function deleteSelection(host: ToolHost): number {
  const ids = [...host.getSelection()]
  if (ids.length === 0) return 0
  const r = deleteShapes(host.doc, ids)
  host.setSelection([])
  return r.ok ? r.value : 0
}

export function createTool(name: ToolName): Tool {
  if (name === 'select') return createSelectTool()
  if (name === 'freehand') return createFreehandTool()
  return createShapeTool(name)
}
