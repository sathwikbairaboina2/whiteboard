import type * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'

export interface SyncOptions {
  roomId: string
  key: string
  signaling: string[]
  /** Pass [] to disable STUN (tests). Undefined keeps simple-peer's defaults. */
  iceServers?: RTCIceServer[]
}

export interface Sync {
  provider: WebrtcProvider
  /** Remote peers with an open data channel, plus same-browser tabs. */
  peerCount(): number
  onPeersChange(cb: (count: number) => void): () => void
  /** Drop every peer connection but keep the doc and IndexedDB. */
  disconnect(): void
  connect(): void
  destroy(): void
}

export const topicFor = (roomId: string): string => `whiteboard-${roomId}`

export function connectRoom(doc: Y.Doc, opts: SyncOptions): Sync {
  const provider = new WebrtcProvider(topicFor(opts.roomId), doc, {
    signaling: opts.signaling,
    password: opts.key,
    peerOpts: opts.iceServers ? { config: { iceServers: opts.iceServers } } : {},
  })
  const peerCount = (): number => {
    const room = provider.room
    if (!room) return 0
    let n = room.bcConns.size
    room.webrtcConns.forEach((conn) => { if (conn.connected) n++ })
    return n
  }
  const listeners = new Set<(count: number) => void>()
  let last = -1
  const check = () => {
    const n = peerCount()
    if (n !== last) { last = n; listeners.forEach((cb) => cb(n)) }
  }
  provider.on('peers', check)
  provider.on('synced', check)
  const timer = setInterval(check, 1000)
  return {
    provider,
    peerCount,
    onPeersChange(cb) { listeners.add(cb); return () => listeners.delete(cb) },
    disconnect() { provider.disconnect(); check() },
    connect() { provider.connect() },
    destroy() { clearInterval(timer); provider.destroy() },
  }
}
