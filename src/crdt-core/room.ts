export interface RoomLink {
  roomId: string
  key: string
}

const ROOM_RE = /^[A-Za-z0-9_-]{12}$/
const KEY_RE = /^[A-Za-z0-9_-]{22}$/

function randomToken(bytes: number, length: number): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  let s = ''
  for (const b of buf) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, length)
}

/** A new room: 12-char id (72 bits) and 22-char key (132 bits), base64url. */
export function createRoomLink(): RoomLink {
  return { roomId: randomToken(9, 12), key: randomToken(17, 22) }
}

/** Parse `#room=...&key=...`. Returns null when either part is missing or malformed. */
export function parseRoomHash(hash: string): RoomLink | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const roomId = params.get('room') ?? ''
  const key = params.get('key') ?? ''
  return ROOM_RE.test(roomId) && KEY_RE.test(key) ? { roomId, key } : null
}

export function formatRoomHash(link: RoomLink): string {
  return `#room=${link.roomId}&key=${link.key}`
}
