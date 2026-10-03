import { mkdirSync, writeFileSync } from 'node:fs'
import * as Y from 'yjs'
import { mulberry32 } from '../src/bench/random'
import { syntheticShapes } from '../src/bench/synthetic'
import { getBoard } from '../src/doc/board'
import { addShape, addShapes, deleteShapes, moveShapes, setStyle } from '../src/doc/commands'
import { attachSanitizer } from '../src/doc/sanitize'

function updateBytes(doc: Y.Doc, run: () => void): number {
  let bytes = 0
  const on = (u: Uint8Array) => { bytes = u.byteLength }
  doc.on('update', on)
  run()
  doc.off('update', on)
  return bytes
}

const canon = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canon)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, x]) => [k, canon(x)]))
      : v

function fingerprint(doc: Y.Doc): string {
  const sv = [...Y.decodeStateVector(Y.encodeStateVector(doc))].sort((a, b) => a[0] - b[0])
  const { shapes, order } = getBoard(doc)
  return JSON.stringify(canon({ sv, shapes: shapes.toJSON(), order: order.toArray() }))
}

function convergence(peersN: number, opsPerPeer: number) {
  const NET = 'net'
  const peers = Array.from({ length: peersN }, (_, i) => {
    const d = new Y.Doc()
    d.clientID = i + 1
    attachSanitizer(d)
    return d
  })
  const queue: Array<{ from: number; update: Uint8Array }> = []
  peers.forEach((doc, i) => {
    doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== NET) queue.push({ from: i, update })
    })
  })
  const rand = mulberry32(42)
  const deliver = (max: number) => {
    let n = 0
    while (queue.length > 0 && n < max) {
      const [msg] = queue.splice(Math.floor(rand() * queue.length), 1)
      peers.forEach((doc, i) => { if (i !== msg.from) Y.applyUpdate(doc, msg.update, NET) })
      n++
    }
  }
  const t0 = performance.now()
  for (let k = 0; k < opsPerPeer; k++) {
    for (let p = 0; p < peersN; p++) {
      const doc = peers[p]
      const ids = getBoard(doc).order.toArray()
      const pick = () => (ids.length ? [ids[Math.floor(rand() * ids.length)]] : [])
      const r = rand()
      if (r < 0.4 || ids.length === 0) addShape(doc, { type: 'rect', x: Math.floor(rand() * 2000), y: Math.floor(rand() * 2000), w: 10 + Math.floor(rand() * 90), h: 10 + Math.floor(rand() * 90) })
      else if (r < 0.75) moveShapes(doc, pick(), Math.floor(rand() * 100) - 50, Math.floor(rand() * 100) - 50)
      else if (r < 0.9) setStyle(doc, pick(), { fill: rand() < 0.5 ? '#ff0000' : 'transparent' })
      else deleteShapes(doc, pick())
    }
    deliver(Math.floor(rand() * 4))
  }
  deliver(Infinity)
  const ms = performance.now() - t0
  const prints = peers.map(fingerprint)
  return { peers: peersN, opsPerPeer, ms: Math.round(ms), converged: prints.every((f) => f === prints[0]) }
}

const oneRect = new Y.Doc()
const rect = addShape(oneRect, { type: 'rect', x: 10, y: 10, w: 50, h: 40 })
if (!rect.ok) throw new Error(rect.error.message)
const moveUpdateBytes = updateBytes(oneRect, () => { moveShapes(oneRect, [rect.value.id], 12.5, 7.25) })
const addDoc = new Y.Doc()
const addRectUpdateBytes = updateBytes(addDoc, () => { addShape(addDoc, { type: 'rect', x: 10, y: 10, w: 50, h: 40 }) })

const big = new Y.Doc()
const added = addShapes(big, syntheticShapes(10_000, 8000, 7))
if (!added.ok) throw new Error(added.error.message)
const docBytes10k = Y.encodeStateAsUpdate(big).byteLength

const result = {
  moveUpdateBytes,
  addRectUpdateBytes,
  docBytes10k,
  convergence: convergence(3, 1000),
}

mkdirSync('bench/results', { recursive: true })
writeFileSync('bench/results/node.json', JSON.stringify(result, null, 2))
console.log(`moveUpdateBytes: ${result.moveUpdateBytes}`)
console.log(`addRectUpdateBytes: ${result.addRectUpdateBytes}`)
console.log(`docBytes10k: ${result.docBytes10k}`)
console.log(`convergence: ${JSON.stringify(result.convergence)}`)
