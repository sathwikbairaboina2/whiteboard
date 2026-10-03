import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { readConfig } from '../src/app/config'
import { Session } from '../src/app/session'
import { createFrameScheduler } from '../src/render/loop'
import { addShape } from '../src/doc/commands'
import { rectInput } from './helpers'

const room = { roomId: 'aaaaaaaaaaaa', key: 'bbbbbbbbbbbbbbbbbbbbbb' }

describe('config', () => {
  it('defaults signaling from env and reads room, ice and debug from the URL', () => {
    const c = readConfig({ search: '?debug=1&ice=none', hash: '#room=aaaaaaaaaaaa&key=bbbbbbbbbbbbbbbbbbbbbb' }, {})
    expect(c).toEqual({ room, signaling: ['ws://localhost:5411'], iceServers: [], debug: true })
  })

  it('a query override wins over env; non-websocket urls are dropped', () => {
    expect(readConfig({ search: '?signaling=ws://localhost:5415', hash: '' }, { VITE_SIGNALING_URLS: 'ws://a:1,wss://b' }).signaling).toEqual(['ws://localhost:5415'])
    expect(readConfig({ search: '', hash: '' }, { VITE_SIGNALING_URLS: 'ws://a:1, wss://b ,http://evil' }).signaling).toEqual(['ws://a:1', 'wss://b'])
    expect(readConfig({ search: '?signaling=javascript:alert(1)', hash: '' }, {}).signaling).toEqual([])
    expect(readConfig({ search: '', hash: '' }, {}).room).toBeNull()
  })
})

describe('frame scheduler', () => {
  it('coalesces invalidations into one frame', () => {
    const queue: FrameRequestCallback[] = []
    let frames = 0
    const s = createFrameScheduler(() => { frames++ }, (cb) => { queue.push(cb); return queue.length }, () => {})
    s.invalidate(); s.invalidate(); s.invalidate()
    expect(queue).toHaveLength(1)
    queue.shift()!(0)
    expect(frames).toBe(1)
    s.invalidate()
    expect(queue).toHaveLength(1)
  })
})

describe('session', () => {
  it('persists across sessions in the same room', async () => {
    const a = new Session({ room, signaling: [], sync: false })
    await a.ready
    addShape(a.doc, rectInput('cccccccccccc'))
    await new Promise((r) => setTimeout(r, 50))
    await a.destroy()
    const b = new Session({ room, signaling: [], sync: false })
    await b.ready
    expect(b.store.shapes.has('cccccccccccc')).toBe(true)
    expect(b.peerCount()).toBe(0)
    await b.destroy()
  })
})
