import * as Y from 'yjs'
import { getBoard } from '../src/doc/board'

export const NET = 'net'

/** Deterministic PRNG for shuffles. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makePeer(clientID: number): Y.Doc {
  const doc = new Y.Doc()
  doc.clientID = clientID
  return doc
}

/**
 * In-memory network. Every update a peer makes (any origin except NET) is queued.
 * deliver() hands queued updates to every other peer, in a shuffled order if a PRNG is given.
 */
export class TestNetwork {
  private queue: Array<{ from: number; update: Uint8Array }> = []

  constructor(readonly peers: Y.Doc[]) {
    peers.forEach((doc, i) => {
      doc.on('update', (update: Uint8Array, origin: unknown) => {
        if (origin !== NET) this.queue.push({ from: i, update })
      })
    })
  }

  get pending(): number {
    return this.queue.length
  }

  /** Deliver up to `max` queued updates (all by default). Repairs made on delivery are queued too. */
  deliver(rand?: () => number, max = Infinity): void {
    let n = 0
    while (this.queue.length > 0 && n < max) {
      const idx = rand ? Math.floor(rand() * this.queue.length) : 0
      const [msg] = this.queue.splice(idx, 1)
      this.peers.forEach((doc, i) => { if (i !== msg.from) Y.applyUpdate(doc, msg.update, NET) })
      n++
    }
  }
}

const canon = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canon)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, x]) => [k, canon(x)]))
      : v

/** Canonical board state: sorted state vector, key-sorted shapes, order array. */
export function fingerprint(doc: Y.Doc): string {
  const sv = [...Y.decodeStateVector(Y.encodeStateVector(doc))].sort((a, b) => a[0] - b[0])
  const { shapes, order } = getBoard(doc)
  return JSON.stringify(canon({ sv, shapes: shapes.toJSON(), order: order.toArray() }))
}

export const rectInput = (id: string, x = 0, y = 0) => ({ id, type: 'rect' as const, x, y, w: 10, h: 10 })
