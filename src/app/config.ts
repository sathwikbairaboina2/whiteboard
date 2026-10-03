import { parseRoomHash, type RoomLink } from '../crdt-core'

export interface AppConfig {
  room: RoomLink | null
  signaling: string[]
  /** [] disables STUN (e2e). Undefined keeps the WebRTC library defaults. */
  iceServers?: RTCIceServer[]
  debug: boolean
}

const WS_URL = /^wss?:\/\/[^\s]+$/

/** Read config from the URL and build-time env. Pure, so it is unit-tested. */
export function readConfig(loc: { search: string; hash: string }, env: { VITE_SIGNALING_URLS?: string }): AppConfig {
  const q = new URLSearchParams(loc.search)
  const fromQuery = q.get('signaling')
  const fromEnv = (env.VITE_SIGNALING_URLS ?? 'ws://localhost:5411').split(',').map((s) => s.trim())
  const signaling = (fromQuery ? [fromQuery] : fromEnv).filter((u) => WS_URL.test(u))
  return {
    room: parseRoomHash(loc.hash),
    signaling,
    iceServers: q.get('ice') === 'none' ? [] : undefined,
    debug: q.get('debug') === '1',
  }
}
