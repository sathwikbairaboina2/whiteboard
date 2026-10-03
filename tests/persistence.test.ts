import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { attachPersistence } from '../src/crdt-core'
import { getBoard } from '../src/doc/board'
import { addShape } from '../src/doc/commands'
import { attachSanitizer } from '../src/doc/sanitize'
import { LIMITS } from '../src/doc/schema'
import { rectInput } from './helpers'

const flush = () => new Promise((r) => setTimeout(r, 50))

describe('persistence', () => {
  it('a new doc in the same room loads what the last one stored', async () => {
    const a = new Y.Doc()
    const pa = attachPersistence(a, 'room-persist-1')
    await pa.whenSynced
    addShape(a, rectInput('aaaaaaaaaaaa', 7, 8))
    await flush()
    await pa.destroy()

    const b = new Y.Doc()
    const pb = attachPersistence(b, 'room-persist-1')
    await pb.whenSynced
    expect(getBoard(b).shapes.get('aaaaaaaaaaaa')?.get('x')).toBe(7)
    await pb.destroy()
  })

  it('rooms do not share storage', async () => {
    const c = new Y.Doc()
    const pc = attachPersistence(c, 'room-persist-2')
    await pc.whenSynced
    expect(getBoard(c).shapes.size).toBe(0)
    await pc.destroy()
  })

  it('stored over-limit data is repaired by the sanitizer on load', async () => {
    const raw = new Y.Doc()
    const pr = attachPersistence(raw, 'room-persist-3')
    await pr.whenSynced
    const m = new Y.Map<unknown>()
    m.set('x', 9e9)
    getBoard(raw).shapes.set('zzzzzzzzzzzz', m)
    await flush()
    await pr.destroy()

    const d = new Y.Doc()
    attachSanitizer(d)
    const pd = attachPersistence(d, 'room-persist-3')
    await pd.whenSynced
    expect(getBoard(d).shapes.get('zzzzzzzzzzzz')?.get('x')).toBe(LIMITS.maxCoord)
    await pd.destroy()
  })
})
