import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import './ui/tokens.css'
import './ui/app.css'
import { formatRoomHash } from './crdt-core'
import { chooseRoom, rememberRoom } from './app/lastRoom'
import { readConfig } from './app/config'
import { Session } from './app/session'
import { App } from './ui/App'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

const config = readConfig(window.location, import.meta.env)
const store = (() => { try { return window.localStorage } catch { return null } })()
const room = chooseRoom(config.room, store)
if (!config.room) {
  history.replaceState(null, '', `${location.pathname}${location.search}${formatRoomHash(room)}`)
}
rememberRoom(store, room)
window.addEventListener('hashchange', () => location.reload())

const session = new Session({ room, signaling: config.signaling, iceServers: config.iceServers })

// Debug-only (?debug=1 or ?hook=1): lets e2e tests cut and restore the peer connection to prove offline edits merge.
if (config.debug || new URLSearchParams(location.search).get('hook') === '1') {
  ;(window as unknown as { __session: Pick<Session, 'disconnect' | 'reconnect'> }).__session = {
    disconnect: () => session.disconnect(),
    reconnect: () => session.reconnect(),
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App session={session} room={room} debug={config.debug} />
  </StrictMode>,
)
