import { describe, expect, it } from 'vitest'
import { createRoomLink, formatRoomHash, parseRoomHash } from '../src/crdt-core'

describe('room links', () => {
  it('creates ids and keys of the right shape that round-trip', () => {
    const link = createRoomLink()
    expect(link.roomId).toMatch(/^[A-Za-z0-9_-]{12}$/)
    expect(link.key).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(parseRoomHash(formatRoomHash(link))).toEqual(link)
  })

  it('never repeats in 1,000 draws', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createRoomLink().roomId))
    expect(ids.size).toBe(1000)
  })

  it('rejects missing or malformed parts', () => {
    expect(parseRoomHash('')).toBeNull()
    expect(parseRoomHash('#room=abc&key=def')).toBeNull()
    expect(parseRoomHash('#room=aaaaaaaaaaaa')).toBeNull()
    expect(parseRoomHash('#room=aaaaaaaaaaa!&key=bbbbbbbbbbbbbbbbbbbbbb')).toBeNull()
    expect(parseRoomHash('#key=bbbbbbbbbbbbbbbbbbbbbb&room=aaaaaaaaaaaa')).toEqual({ roomId: 'aaaaaaaaaaaa', key: 'bbbbbbbbbbbbbbbbbbbbbb' })
  })
})
