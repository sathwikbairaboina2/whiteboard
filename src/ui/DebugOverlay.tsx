import { useEffect, useState } from 'react'
import type { BoardController, ControllerSnapshot, PaintStats } from '../app/controller'
import type { Session } from '../app/session'

export function DebugOverlay({ controller, session, snap }: { controller: BoardController; session: Session; snap: ControllerSnapshot }) {
  const [stats, setStats] = useState<PaintStats>(controller.getStats())
  const [peers, setPeers] = useState(session.peerCount())
  useEffect(() => {
    const id = setInterval(() => {
      setStats(controller.getStats())
      setPeers(session.peerCount())
    }, 250)
    return () => clearInterval(id)
  }, [controller, session])
  return (
    <dl className="debug" data-testid="debug">
      <dt>Shapes</dt><dd>{snap.shapes}</dd>
      <dt>Invalid</dt><dd>{snap.invalid}</dd>
      <dt>Drawn</dt><dd>{stats.drawn}</dd>
      <dt>Paint ms</dt><dd>{stats.paintMs.toFixed(1)}</dd>
      <dt>Peers</dt><dd>{peers}</dd>
    </dl>
  )
}
