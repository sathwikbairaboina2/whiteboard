import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import './ui/tokens.css'
import './ui/app.css'
import { createRoomLink, formatRoomHash } from './crdt-core'
import { readConfig } from './app/config'
import { Session } from './app/session'
import { App } from './ui/App'

const config = readConfig(window.location, import.meta.env)
let room = config.room
if (!room) {
  room = createRoomLink()
  history.replaceState(null, '', `${location.pathname}${location.search}${formatRoomHash(room)}`)
}
window.addEventListener('hashchange', () => location.reload())

const session = new Session({ room, signaling: config.signaling, iceServers: config.iceServers })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App session={session} room={room} debug={config.debug} />
  </StrictMode>,
)
