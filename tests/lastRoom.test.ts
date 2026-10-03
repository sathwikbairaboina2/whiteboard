import { describe, expect, it } from 'vitest'
import { chooseRoom, LAST_ROOM_KEY, readLastRoom, rememberRoom } from '../src/app/lastRoom'

const a = { roomId: 'aaaaaaaaaaaa', key: 'bbbbbbbbbbbbbbbbbbbbbb' }
const b = { roomId: 'cccccccccccc', key: 'dddddddddddddddddddddd' }

function memory(): Storage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) } } as never
}

describe('last room', () => {
  it('a link in the URL wins over the remembered room', () => {
    const s = memory()
    rememberRoom(s, b)
    expect(chooseRoom(a, s)).toEqual(a)
  })

  it('with no link, reuses the remembered room', () => {
    const s = memory()
    rememberRoom(s, a)
    expect(chooseRoom(null, s)).toEqual(a)
  })

  it('with no link and nothing stored, creates a fresh valid room', () => {
    const r = chooseRoom(null, memory())
    expect(r.roomId).toMatch(/^[A-Za-z0-9_-]{12}$/)
    expect(r).not.toEqual(a)
  })

  it('ignores a corrupt record and survives a throwing or missing store', () => {
    const s = memory()
    s.data.set(LAST_ROOM_KEY, '{"roomId":"short","key":"x"}')
    expect(readLastRoom(s)).toBeNull()
    s.data.set(LAST_ROOM_KEY, 'not json')
    expect(readLastRoom(s)).toBeNull()
    const throwing = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(readLastRoom(throwing)).toBeNull()
    expect(() => rememberRoom(throwing, a)).not.toThrow()
    expect(chooseRoom(null, null).roomId).toHaveLength(12)
  })
})
