import { createRoomLink, formatRoomHash, parseRoomHash, type RoomLink } from '../crdt-core'

export const LAST_ROOM_KEY = 'whiteboard:lastRoom'

type Store = Pick<Storage, 'getItem' | 'setItem'>

/** The room remembered on this device, or null when nothing valid is stored. */
export function readLastRoom(store: Store | null): RoomLink | null {
  try {
    const raw = store?.getItem(LAST_ROOM_KEY)
    return raw ? parseRoomHash(formatRoomHash(JSON.parse(raw))) : null
  } catch {
    return null
  }
}

export function rememberRoom(store: Store | null, room: RoomLink): void {
  try {
    store?.setItem(LAST_ROOM_KEY, JSON.stringify({ roomId: room.roomId, key: room.key }))
  } catch {
    // Storage can be blocked or full; the board still works without the pointer.
  }
}

/** Link in the URL wins, then the last room on this device, then a new room. */
export function chooseRoom(fromUrl: RoomLink | null, store: Store | null): RoomLink {
  return fromUrl ?? readLastRoom(store) ?? createRoomLink()
}
