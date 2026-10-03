import * as Y from 'yjs'
import { readConfig } from '../app/config'
import { connectRoom, type Sync } from '../crdt-core'
import { getBoard } from '../doc/board'
import { addShape, addShapes } from '../doc/commands'
import { panBy, viewportBounds, type Camera } from '../render/camera'
import { paint, type CanvasLike } from '../render/canvas'
import { buildScene } from '../render/scene'
import { BoardStore } from '../render/store'
import { syntheticShapes } from './synthetic'

export interface PanOptions {
  shapes: number
  frames: number
  zoom: number
}

export interface PanResult {
  shapes: number
  frames: number
  zoom: number
  paintP50Ms: number
  paintP95Ms: number
  frameP50Ms: number
  frameP95Ms: number
  drawnAvg: number
}

const WIDTH = 1280
const HEIGHT = 720
const WARMUP = 10

const q = (sorted: number[], p: number): number => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
const round2 = (v: number): number => Math.round(v * 100) / 100
const nextFrame = (): Promise<number> => new Promise((r) => requestAnimationFrame(r))

async function pan(o: PanOptions): Promise<PanResult> {
  const doc = new Y.Doc()
  const added = addShapes(doc, syntheticShapes(o.shapes, 8000, 7))
  if (!added.ok) throw new Error(added.error.message)
  const store = new BoardStore(doc)
  const canvas = document.getElementById('c') as HTMLCanvasElement
  canvas.width = WIDTH
  canvas.height = HEIGHT
  canvas.style.width = `${WIDTH}px`
  canvas.style.height = `${HEIGHT}px`
  const ctx = canvas.getContext('2d')!
  let camera: Camera = { x: 0, y: 0, zoom: o.zoom }
  // 8 px per frame at zoom 1; scaled down when zoomed out so the camera stays over the 8000-unit world.
  const step = Math.min(1, o.zoom)
  const paintMs: number[] = []
  const frameMs: number[] = []
  let drawnTotal = 0
  let last = await nextFrame()
  for (let i = 0; i < o.frames + WARMUP; i++) {
    const ts = await nextFrame()
    const delta = ts - last
    last = ts
    camera = panBy(camera, -8 * step, -4 * step)
    const t0 = performance.now()
    const vp = viewportBounds(camera, WIDTH, HEIGHT)
    const visible = store.index.search(vp)
    const items = buildScene({ shapes: store.shapes, order: store.order }, vp, visible)
    const drawn = paint(ctx as unknown as CanvasLike, items, { camera, width: WIDTH, height: HEIGHT, dpr: 1, background: '#f6f5f1', accent: '#2f5bea' })
    const dt = performance.now() - t0
    if (i >= WARMUP) {
      paintMs.push(dt)
      frameMs.push(delta)
      drawnTotal += drawn
    }
  }
  store.destroy()
  const p = [...paintMs].sort((a, b) => a - b)
  const f = [...frameMs].sort((a, b) => a - b)
  return {
    shapes: o.shapes,
    frames: o.frames,
    zoom: o.zoom,
    paintP50Ms: round2(q(p, 0.5)),
    paintP95Ms: round2(q(p, 0.95)),
    frameP50Ms: round2(q(f, 0.5)),
    frameP95Ms: round2(q(f, 0.95)),
    drawnAvg: round2(drawnTotal / paintMs.length),
  }
}

interface PeerBench {
  peers(): number
  send(n: number, gapMs: number): Promise<Record<string, number>>
  received(): Record<string, number>
}

function peerMode(): PeerBench {
  const config = readConfig(window.location, import.meta.env)
  if (!config.room) throw new Error('peer mode needs #room=...&key=...')
  const doc = new Y.Doc()
  const sync: Sync = connectRoom(doc, { roomId: config.room.roomId, key: config.room.key, signaling: config.signaling, iceServers: config.iceServers })
  const got: Record<string, number> = {}
  getBoard(doc).shapes.observe((event) => {
    if (event.transaction.local) return
    event.changes.keys.forEach((change, key) => {
      if (change.action === 'add') got[key] = performance.timeOrigin + performance.now()
    })
  })
  return {
    peers: () => sync.peerCount(),
    async send(n, gapMs) {
      const sent: Record<string, number> = {}
      for (let i = 0; i < n; i++) {
        const id = `bench${String(i).padStart(7, '0')}`
        sent[id] = performance.timeOrigin + performance.now()
        addShape(doc, { id, type: 'rect', x: i * 12, y: 0, w: 10, h: 10 })
        await new Promise((r) => setTimeout(r, gapMs))
      }
      return sent
    },
    received: () => ({ ...got }),
  }
}

declare global {
  interface Window {
    __bench: { pan: typeof pan } & Partial<PeerBench>
  }
}

const mode = new URLSearchParams(location.search).get('mode')
window.__bench = mode === 'peer' ? { pan, ...peerMode() } : { pan }
