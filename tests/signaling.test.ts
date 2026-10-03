import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import { MAX_TOPICS_PER_CONN, startSignaling, type SignalingServer } from '../server/signaling'

let server: SignalingServer
const url = () => `ws://127.0.0.1:${server.port}`

function client(): Promise<{ ws: WebSocket; next: () => Promise<Record<string, unknown>> }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url())
    const inbox: Record<string, unknown>[] = []
    const waiters: Array<(m: Record<string, unknown>) => void> = []
    ws.on('message', (raw) => {
      const m = JSON.parse(String(raw))
      const w = waiters.shift()
      if (w) w(m)
      else inbox.push(m)
    })
    const next = () => new Promise<Record<string, unknown>>((r) => {
      const m = inbox.shift()
      if (m) r(m)
      else waiters.push(r)
    })
    ws.on('open', () => resolve({ ws, next }))
    ws.on('error', reject)
  })
}

const settle = () => new Promise((r) => setTimeout(r, 50))

beforeAll(async () => { server = await startSignaling(0) })
afterAll(async () => { await server.close() })

describe('signaling server', () => {
  it('answers HTTP health checks with okay', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/`)
    expect(await res.text()).toBe('okay')
  })

  it('relays publish to every subscriber of the topic, with a client count', async () => {
    const a = await client()
    const b = await client()
    a.ws.send(JSON.stringify({ type: 'subscribe', topics: ['t1'] }))
    b.ws.send(JSON.stringify({ type: 'subscribe', topics: ['t1'] }))
    await settle()
    a.ws.send(JSON.stringify({ type: 'publish', topic: 't1', data: 'hello' }))
    expect(await b.next()).toEqual({ type: 'publish', topic: 't1', data: 'hello', clients: 2 })
    a.ws.close(); b.ws.close()
  })

  it('does not relay to other topics or after unsubscribe', async () => {
    const a = await client()
    const b = await client()
    await settle()
    const base = server.topicCount()
    b.ws.send(JSON.stringify({ type: 'subscribe', topics: ['t2'] }))
    await settle()
    expect(server.topicCount()).toBe(base + 1)
    b.ws.send(JSON.stringify({ type: 'unsubscribe', topics: ['t2'] }))
    a.ws.send(JSON.stringify({ type: 'subscribe', topics: ['t3'] }))
    await settle()
    expect(server.topicCount()).toBe(base + 1) // t2 removed, t3 added
    a.ws.send(JSON.stringify({ type: 'publish', topic: 't2', data: 'x' }))
    b.ws.send(JSON.stringify({ type: 'ping' }))
    expect(await b.next()).toEqual({ type: 'pong' })
    a.ws.close(); b.ws.close()
  })

  it('caps topics per connection and ignores garbage', async () => {
    const a = await client()
    const topics = Array.from({ length: MAX_TOPICS_PER_CONN + 5 }, (_, i) => `cap-${i}`)
    a.ws.send('not json')
    a.ws.send(JSON.stringify({ type: 'subscribe', topics }))
    await settle()
    const b = await client()
    b.ws.send(JSON.stringify({ type: 'publish', topic: `cap-${MAX_TOPICS_PER_CONN + 1}`, data: 'over' }))
    b.ws.send(JSON.stringify({ type: 'publish', topic: 'cap-0', data: 'under' }))
    expect(await a.next()).toMatchObject({ topic: 'cap-0', data: 'under' })
    a.ws.close(); b.ws.close()
  })
})
