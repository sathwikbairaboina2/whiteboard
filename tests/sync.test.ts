import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { connectRoom, topicFor } from '../src/crdt-core'

describe('sync wrapper', () => {
  it('names the topic per room and starts with zero peers', async () => {
    expect(topicFor('aaaaaaaaaaaa')).toBe('whiteboard-aaaaaaaaaaaa')
    const doc = new Y.Doc()
    const sync = connectRoom(doc, { roomId: 'aaaaaaaaaaaa', key: 'bbbbbbbbbbbbbbbbbbbbbb', signaling: [], iceServers: [] })
    expect(sync.provider.roomName).toBe('whiteboard-aaaaaaaaaaaa')
    expect(sync.peerCount()).toBe(0)
    let calls = 0
    const off = sync.onPeersChange(() => { calls++ })
    off()
    sync.destroy()
    expect(calls).toBe(0)
  })
})
