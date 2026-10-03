import type { Bounds, Shape } from '../doc/schema'
import type { Camera } from './camera'

/** The subset of CanvasRenderingContext2D the painter uses, so tests can pass a recorder. */
export interface CanvasLike {
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void
  fillRect(x: number, y: number, w: number, h: number): void
  beginPath(): void
  rect(x: number, y: number, w: number, h: number): void
  ellipse(x: number, y: number, rx: number, ry: number, rotation: number, start: number, end: number): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  stroke(): void
  fill(): void
  setLineDash(segments: number[]): void
  strokeStyle: unknown
  fillStyle: unknown
  lineWidth: number
  lineJoin: string
  lineCap: string
}

export interface PaintOptions {
  camera: Camera
  width: number
  height: number
  dpr: number
  background: string
  accent: string
  selected?: ReadonlySet<string>
  /** Offset applied to selected shapes while they are being dragged. */
  dragOffset?: { dx: number; dy: number } | null
  /** A shape being drawn that is not in the doc yet. */
  draft?: Shape | null
  marquee?: Bounds | null
}

function tracePath(ctx: CanvasLike, s: Shape, dx: number, dy: number): void {
  const x = s.x + dx, y = s.y + dy
  ctx.beginPath()
  if (s.type === 'rect') ctx.rect(x, y, s.w, s.h)
  else if (s.type === 'ellipse') ctx.ellipse(x + s.w / 2, y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2)
  else {
    const p = s.points ?? []
    ctx.moveTo(x + p[0], y + p[1])
    if (p.length === 2) ctx.lineTo(x + p[0] + 0.01, y + p[1])
    for (let i = 2; i + 1 < p.length; i += 2) ctx.lineTo(x + p[i], y + p[i + 1])
  }
}

function drawShape(ctx: CanvasLike, s: Shape, dx: number, dy: number): void {
  tracePath(ctx, s, dx, dy)
  if (s.fill !== 'transparent' && s.type !== 'freehand') {
    ctx.fillStyle = s.fill
    ctx.fill()
  }
  ctx.strokeStyle = s.stroke
  ctx.lineWidth = s.strokeWidth
  ctx.stroke()
}

function dashedRect(ctx: CanvasLike, x: number, y: number, w: number, h: number, zoom: number): void {
  ctx.setLineDash([4 / zoom, 3 / zoom])
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.stroke()
  ctx.setLineDash([])
}

/** Paint one frame. Returns how many shapes were drawn, including the draft. */
export function paint(ctx: CanvasLike, items: readonly Shape[], o: PaintOptions): number {
  const k = o.dpr * o.camera.zoom
  ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0)
  ctx.fillStyle = o.background
  ctx.fillRect(0, 0, o.width, o.height)
  ctx.setTransform(k, 0, 0, k, -o.camera.x * k, -o.camera.y * k)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.setLineDash([])
  const off = o.dragOffset ?? { dx: 0, dy: 0 }
  let drawn = 0
  for (const s of items) {
    const moving = o.selected?.has(s.id) ?? false
    drawShape(ctx, s, moving ? off.dx : 0, moving ? off.dy : 0)
    drawn++
  }
  if (o.draft) { drawShape(ctx, o.draft, 0, 0); drawn++ }
  ctx.strokeStyle = o.accent
  ctx.lineWidth = 1.5 / o.camera.zoom
  if (o.selected && o.selected.size > 0) {
    const pad = 4 / o.camera.zoom
    for (const s of items) {
      if (!o.selected.has(s.id)) continue
      const p = pad + s.strokeWidth / 2
      dashedRect(ctx, s.x + off.dx - p, s.y + off.dy - p, s.w + p * 2, s.h + p * 2, o.camera.zoom)
    }
  }
  if (o.marquee) {
    const m = o.marquee
    dashedRect(ctx, m.minX, m.minY, m.maxX - m.minX, m.maxY - m.minY, o.camera.zoom)
  }
  return drawn
}
