import { setStyle } from '../doc/commands'
import { panBy, screenToWorld, viewportBounds, zoomAt, type Camera } from '../render/camera'
import { paint, type CanvasLike } from '../render/canvas'
import { createFrameScheduler, type FrameScheduler } from '../render/loop'
import { buildScene } from '../render/scene'
import {
  EMPTY_PREVIEW, createTool, deleteSelection,
  type Preview, type Style, type Tool, type ToolHost, type ToolName,
} from '../tools/tools'
import type { Session } from './session'

export interface ControllerSnapshot {
  tool: ToolName
  selection: readonly string[]
  style: Style
  canUndo: boolean
  canRedo: boolean
  shapes: number
  invalid: number
}

export interface PaintStats {
  drawn: number
  paintMs: number
}

const TOOL_KEYS: Record<string, ToolName> = { v: 'select', r: 'rect', o: 'ellipse', p: 'freehand' }

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
}

/** Owns the canvas: sizing, input, camera, tools and the paint loop. Writes only through commands and tools. */
export class BoardController {
  private camera: Camera = { x: 0, y: 0, zoom: 1 }
  private toolName: ToolName = 'select'
  private tool: Tool = createTool('select')
  private selection = new Set<string>()
  private preview: Preview = EMPTY_PREVIEW
  private size = { width: 0, height: 0, dpr: 1 }
  private style: Style = { stroke: '#1e1e1e', fill: 'transparent', strokeWidth: 2 }
  private stats: PaintStats = { drawn: 0, paintMs: 0 }
  private snapshot: ControllerSnapshot
  private listeners = new Set<() => void>()
  private spaceDown = false
  private panning: { x: number; y: number } | null = null
  private drawing = false
  private readonly ctx: CanvasRenderingContext2D
  private readonly scheduler: FrameScheduler
  private readonly observer: ResizeObserver
  private readonly offs: Array<() => void> = []
  private readonly host: ToolHost

  constructor(private readonly canvas: HTMLCanvasElement, private readonly session: Session, private readonly colors: { background: string; accent: string }) {
    this.ctx = canvas.getContext('2d')!
    this.scheduler = createFrameScheduler(() => this.frame())
    const self = this
    this.host = {
      doc: session.doc,
      store: session.store,
      get style() { return self.style },
      get pixel() { return 1 / self.camera.zoom },
      getSelection: () => this.selection,
      setSelection: (ids) => {
        this.selection = new Set(ids)
        this.scheduler.invalidate()
        this.emit()
      },
      setPreview: (p) => {
        this.preview = p
        this.scheduler.invalidate()
      },
    }
    this.snapshot = this.makeSnapshot()

    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(canvas.parentElement ?? canvas)
    this.resize()

    this.offs.push(
      session.store.subscribe(() => {
        for (const id of this.selection) if (!session.store.shapes.has(id)) this.selection.delete(id)
        this.scheduler.invalidate()
        this.emit()
      }),
      session.history.onChange(() => this.emit()),
    )
    this.listen(canvas, 'pointerdown', this.onDown)
    this.listen(canvas, 'pointermove', this.onMove)
    this.listen(canvas, 'pointerup', this.onUp)
    this.listen(canvas, 'pointercancel', this.onCancel)
    this.listen(canvas, 'wheel', this.onWheel, { passive: false })
    this.listen(window, 'keydown', this.onKeyDown)
    this.listen(window, 'keyup', this.onKeyUp)
    this.scheduler.invalidate()
  }

  private listen(target: EventTarget, type: string, fn: (e: never) => void, opts?: AddEventListenerOptions): void {
    target.addEventListener(type, fn as EventListener, opts)
    this.offs.push(() => target.removeEventListener(type, fn as EventListener, opts))
  }

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb)
    return () => { this.listeners.delete(cb) }
  }

  getSnapshot = (): ControllerSnapshot => this.snapshot

  getStats(): PaintStats {
    return this.stats
  }

  private makeSnapshot(): ControllerSnapshot {
    return {
      tool: this.toolName,
      selection: [...this.selection],
      style: { ...this.style },
      canUndo: this.session.history.canUndo(),
      canRedo: this.session.history.canRedo(),
      shapes: this.session.store.shapes.size,
      invalid: this.session.store.invalid.size,
    }
  }

  private emit(): void {
    this.snapshot = this.makeSnapshot()
    this.listeners.forEach((cb) => cb())
  }

  setTool(name: ToolName): void {
    this.tool.cancel(this.host)
    this.toolName = name
    this.tool = createTool(name)
    this.emit()
  }

  setStyle(patch: Partial<Style>): void {
    this.style = { ...this.style, ...patch }
    if (this.selection.size > 0) setStyle(this.session.doc, [...this.selection], patch)
    this.scheduler.invalidate()
    this.emit()
  }

  undo(): void {
    this.session.history.undo()
  }

  redo(): void {
    this.session.history.redo()
  }

  deleteSelected(): void {
    deleteSelection(this.host)
  }

  private resize(): void {
    const parent = this.canvas.parentElement ?? this.canvas
    const rect = parent.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const width = Math.max(1, Math.floor(rect.width))
    const height = Math.max(1, Math.floor(rect.height))
    this.size = { width, height, dpr }
    this.canvas.width = Math.round(width * dpr)
    this.canvas.height = Math.round(height * dpr)
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.scheduler.invalidate()
  }

  private frame(): void {
    const { width, height, dpr } = this.size
    const store = this.session.store
    const vp = viewportBounds(this.camera, width, height)
    const visible = store.index.search(vp)
    const t0 = performance.now()
    const items = buildScene({ shapes: store.shapes, order: store.order }, vp, visible)
    const drawn = paint(this.ctx as unknown as CanvasLike, items, {
      camera: this.camera, width, height, dpr,
      background: this.colors.background, accent: this.colors.accent,
      selected: this.selection, dragOffset: this.preview.dragOffset, draft: this.preview.draft, marquee: this.preview.marquee,
    })
    this.stats = { drawn, paintMs: performance.now() - t0 }
    this.canvas.dataset.shapes = String(store.shapes.size)
  }

  private world(e: PointerEvent): { x: number; y: number; shift: boolean } {
    const w = screenToWorld(this.camera, e.offsetX, e.offsetY)
    return { x: w.x, y: w.y, shift: e.shiftKey }
  }

  private onDown = (e: PointerEvent): void => {
    this.canvas.setPointerCapture(e.pointerId)
    if (e.button === 1 || (e.button === 0 && this.spaceDown)) {
      this.panning = { x: e.offsetX, y: e.offsetY }
      return
    }
    if (e.button !== 0) return
    this.drawing = true
    this.tool.down(this.world(e), this.host)
  }

  private onMove = (e: PointerEvent): void => {
    if (this.panning) {
      this.camera = panBy(this.camera, e.offsetX - this.panning.x, e.offsetY - this.panning.y)
      this.panning = { x: e.offsetX, y: e.offsetY }
      this.scheduler.invalidate()
      return
    }
    if (this.drawing) this.tool.move(this.world(e), this.host)
  }

  private onUp = (e: PointerEvent): void => {
    if (this.panning) {
      this.panning = null
      return
    }
    if (this.drawing) {
      this.drawing = false
      this.tool.up(this.world(e), this.host)
    }
  }

  private onCancel = (): void => {
    this.panning = null
    if (this.drawing) {
      this.drawing = false
      this.tool.cancel(this.host)
    }
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) this.camera = zoomAt(this.camera, e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.01))
    else this.camera = panBy(this.camera, -e.deltaX, -e.deltaY)
    this.scheduler.invalidate()
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isTyping(e.target)) return
    const mod = e.ctrlKey || e.metaKey
    const key = e.key.toLowerCase()
    if (mod && key === 'z') {
      e.preventDefault()
      if (e.shiftKey) this.redo()
      else this.undo()
    } else if (mod && key === 'y') {
      e.preventDefault()
      this.redo()
    } else if (mod) {
      return
    } else if (key === ' ') {
      e.preventDefault()
      this.spaceDown = true
    } else if (key === 'delete' || key === 'backspace') {
      this.deleteSelected()
    } else if (key === 'escape') {
      this.tool.cancel(this.host)
      this.drawing = false
      this.host.setSelection([])
    } else if (TOOL_KEYS[key]) {
      this.setTool(TOOL_KEYS[key])
    }
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.key === ' ') this.spaceDown = false
  }

  destroy(): void {
    this.offs.forEach((off) => off())
    this.offs.length = 0
    this.observer.disconnect()
    this.scheduler.destroy()
    this.listeners.clear()
  }
}
