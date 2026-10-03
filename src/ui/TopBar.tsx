import { useEffect, useState } from 'react'
import type { Session } from '../app/session'
import { useOnline } from './useOnline'

function usePeers(session: Session): number {
  const [n, setN] = useState(() => session.peerCount())
  useEffect(() => {
    setN(session.peerCount())
    return session.onPeersChange(setN)
  }, [session])
  return n
}

const peerLabel = (n: number): string => (n === 0 ? 'Only you' : n === 1 ? '1 peer' : `${n} peers`)

export function TopBar({ session, roomId }: { session: Session; roomId: string }) {
  const peers = usePeers(session)
  const online = useOnline()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <header className="topbar">
      <span className="wordmark">Whiteboard</span>
      <span className="roomtag">{roomId.slice(0, 4)}</span>
      <span className="spacer" />
      <span className="status" data-testid="peer-count">{peerLabel(peers)}</span>
      <span className={online ? 'status' : 'status is-offline'} data-testid="net-status">{online ? 'Online' : 'Offline'}</span>
      <button type="button" className="btn" data-testid="copy-link" onClick={copy}>
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </header>
  )
}
