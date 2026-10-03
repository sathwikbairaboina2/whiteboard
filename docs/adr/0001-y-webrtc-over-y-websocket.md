# ADR 0001: y-webrtc with a self-hosted signaling server, not y-websocket

Date: 2026-10-04. Status: accepted.

## Context
The board must sync between devices with no server that stores or sees content. Yjs offers two mature transports: y-websocket (a relay that receives every update) and y-webrtc (peers talk over WebRTC data channels; a signaling server only introduces them).

## Decision
- Use `y-webrtc@10.3.0` with the room `password` option, so signaling messages and updates are encrypted with a key taken from the URL fragment.
- Self-host signaling: `server/signaling.ts` implements y-webrtc's small pub/sub protocol (subscribe, unsubscribe, publish, ping) on `ws@8.22.0`. It is based on y-webrtc's MIT `bin/server.js`, credited in the file header. It adds a 64 KiB message cap and a 100-topic-per-connection cap.
- Signaling URLs come from `VITE_SIGNALING_URLS` (default `ws://localhost:5411`), overridable with `?signaling=`. The public y-webrtc signaling servers are not used by default: they are best-effort and would see room topic names.
- Same-browser tabs also sync over BroadcastChannel, which y-webrtc does for free.

## Consequences
- Prototype (2026-10-04): two Playwright Chromium contexts discovered each other in about 2.8 s and synced a map entry, both with STUN and with `iceServers: []`.
- What I gave up: peers behind symmetric NAT or strict corporate networks cannot connect, because there is no TURN server. The UI shows the peer count, so "0 peers" is visible, but there is no relay fallback in v0.1.
- What I gave up: y-websocket would give server-side persistence and a single sync point. Here a board exists only on devices that have opened it. Two people who are never online at the same time never sync.
- The signaling server can see which topic a connection joins and when. It never sees shapes.
