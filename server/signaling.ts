/**
 * Stateless signaling server for y-webrtc: topic pub/sub over WebSocket.
 * Based on y-webrtc's bin/server.js (MIT, Kevin Jahns, https://github.com/yjs/y-webrtc).
 * Changes: TypeScript, a message size cap, a per-connection topic cap, a health endpoint, start/stop for tests.
 * It never stores anything and only sees encrypted signaling payloads.
 */
import http from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'

export const MAX_MESSAGE_BYTES = 64 * 1024
export const MAX_TOPICS_PER_CONN = 100
const PING_MS = 30_000

type Msg = { type?: unknown; topics?: unknown; topic?: unknown; [k: string]: unknown }

export interface SignalingServer {
  port: number
  close(): Promise<void>
}

export function startSignaling(port: number): Promise<SignalingServer> {
  const topics = new Map<string, Set<WebSocket>>()
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('okay')
  })
  const wss = new WebSocketServer({ server, maxPayload: MAX_MESSAGE_BYTES })

  const send = (conn: WebSocket, msg: Msg) => {
    if (conn.readyState !== conn.OPEN) return
    try { conn.send(JSON.stringify(msg)) } catch { conn.close() }
  }

  wss.on('connection', (conn) => {
    const mine = new Set<string>()
    let alive = true
    const ping = setInterval(() => {
      if (!alive) { conn.terminate(); return }
      alive = false
      try { conn.ping() } catch { conn.terminate() }
    }, PING_MS)
    conn.on('pong', () => { alive = true })
    conn.on('close', () => {
      clearInterval(ping)
      for (const t of mine) {
        const subs = topics.get(t)
        subs?.delete(conn)
        if (subs && subs.size === 0) topics.delete(t)
      }
      mine.clear()
    })
    conn.on('message', (raw) => {
      let msg: Msg
      try { msg = JSON.parse(String(raw)) } catch { return }
      if (!msg || typeof msg !== 'object') return
      switch (msg.type) {
        case 'subscribe':
          for (const t of Array.isArray(msg.topics) ? msg.topics : []) {
            if (typeof t !== 'string' || mine.size >= MAX_TOPICS_PER_CONN) continue
            if (!topics.has(t)) topics.set(t, new Set())
            topics.get(t)!.add(conn)
            mine.add(t)
          }
          break
        case 'unsubscribe':
          for (const t of Array.isArray(msg.topics) ? msg.topics : []) {
            if (typeof t !== 'string') continue
            topics.get(t)?.delete(conn)
            mine.delete(t)
          }
          break
        case 'publish':
          if (typeof msg.topic === 'string') {
            const receivers = topics.get(msg.topic)
            if (receivers) {
              const out = { ...msg, clients: receivers.size }
              receivers.forEach((r) => send(r, out))
            }
          }
          break
        case 'ping':
          send(conn, { type: 'pong' })
          break
      }
    })
  })

  return new Promise((resolve) => {
    server.listen(port, () => {
      const addr = server.address()
      resolve({
        port: typeof addr === 'object' && addr ? addr.port : port,
        close: () => new Promise<void>((done) => {
          wss.clients.forEach((c) => c.terminate())
          wss.close(() => server.close(() => done()))
        }),
      })
    })
  })
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 5411)
  startSignaling(port).then((s) => console.log(`signaling listening on ${s.port}`))
}
