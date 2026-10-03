import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { BoardController } from '../app/controller'
import type { Session } from '../app/session'
import type { RoomLink } from '../crdt-core'
import { DebugOverlay } from './DebugOverlay'
import { TopBar } from './TopBar'
import { Toolbar } from './Toolbar'

export function App({ session, room, debug }: { session: Session; room: RoomLink; debug: boolean }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    session.ready.then(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [session])

  if (!ready) return <div className="opening">Opening board</div>
  return <Board session={session} room={room} debug={debug} />
}

function Board({ session, room, debug }: { session: Session; room: RoomLink; debug: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [controller, setController] = useState<BoardController | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const css = getComputedStyle(document.documentElement)
    const c = new BoardController(canvas, session, {
      background: css.getPropertyValue('--paper').trim() || '#f6f5f1',
      accent: css.getPropertyValue('--accent').trim() || '#2f5bea',
    })
    setController(c)
    return () => {
      c.destroy()
      setController(null)
    }
  }, [session])

  return (
    <div className="layout">
      <TopBar session={session} roomId={room.roomId} />
      <div className="stage">
        <canvas ref={canvasRef} data-testid="board" />
        {controller && <Chrome controller={controller} session={session} debug={debug} />}
      </div>
    </div>
  )
}

function Chrome({ controller, session, debug }: { controller: BoardController; session: Session; debug: boolean }) {
  const snap = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  return (
    <>
      <Toolbar controller={controller} snap={snap} />
      {debug && <DebugOverlay controller={controller} session={session} snap={snap} />}
    </>
  )
}
