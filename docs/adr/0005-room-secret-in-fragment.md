# ADR 0005: Room id and key in the URL fragment

Date: 2026-10-04. Status: accepted.

## Context
There are no accounts. Something must decide who can join a board.

## Decision
- The URL is `/#room=<12 chars>&key=<22 chars>`, both from `crypto.getRandomValues` in base64url. Browsers never send the fragment to a server.
- The key is passed to y-webrtc as `password`, which encrypts signaling and data-channel messages with WebCrypto.
- The IndexedDB database name is `whiteboard:<room>`, so different rooms never mix locally.

## Consequences
- What I gave up: anyone with the link has full write access. There is no read-only link and no revocation. To "revoke", start a new room.
- What I gave up: the link is the secret, so pasting it in a public channel publishes the board.
- Update: the last opened room (id and key) is also kept in this browser's `localStorage` (`whiteboard:lastRoom`), so opening `/` or launching the installed app returns to the previous board instead of a blank one. The key therefore also lives on the device in clear text, next to the IndexedDB copy of the board. Anyone with access to the browser profile can already read that board, so this adds no new exposure; clearing site data forgets it. If storage is blocked, a new room is created.
