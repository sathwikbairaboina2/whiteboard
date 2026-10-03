import * as Y from 'yjs'
import { attachPersistence, connectRoom, type Persistence, type RoomLink, type Sync } from '../crdt-core'
import { attachSanitizer } from '../doc/sanitize'
import { createHistory, type History } from '../history/undo'
import { BoardStore } from '../render/store'

export interface SessionOptions {
  room: RoomLink
  signaling: string[]
  iceServers?: RTCIceServer[]
  /** Tests can turn either side off. */
  persist?: boolean
  sync?: boolean
}

/** One open board: doc, sanitizer, store, history, IndexedDB, WebRTC. */
export class Session {
  readonly doc = new Y.Doc()
  readonly store: BoardStore
  readonly history: History
  readonly ready: Promise<void>
  repairs = 0
  private readonly persistence: Persistence | null
  private readonly sync: Sync | null
  private readonly detachSanitizer: () => void

  constructor(readonly opts: SessionOptions) {
    this.detachSanitizer = attachSanitizer(this.doc, (n) => { this.repairs += n })
    this.store = new BoardStore(this.doc)
    this.history = createHistory(this.doc)
    this.persistence = opts.persist === false ? null : attachPersistence(this.doc, opts.room.roomId)
    this.ready = this.persistence ? this.persistence.whenSynced : Promise.resolve()
    this.sync = opts.sync === false
      ? null
      : connectRoom(this.doc, { roomId: opts.room.roomId, key: opts.room.key, signaling: opts.signaling, iceServers: opts.iceServers })
  }

  peerCount(): number {
    return this.sync?.peerCount() ?? 0
  }

  onPeersChange(cb: (n: number) => void): () => void {
    return this.sync ? this.sync.onPeersChange(cb) : () => {}
  }

  /** Cut the peer connection but keep editing locally. Used by the debug hook in e2e tests. */
  disconnect(): void {
    this.sync?.disconnect()
  }

  reconnect(): void {
    this.sync?.connect()
  }

  async destroy(): Promise<void> {
    this.sync?.destroy()
    await this.persistence?.destroy()
    this.history.destroy()
    this.store.destroy()
    this.detachSanitizer()
    this.doc.destroy()
  }
}
