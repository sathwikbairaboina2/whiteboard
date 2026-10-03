import * as Y from 'yjs'
import { getBoard, ORIGIN_LOCAL } from '../doc/board'

export interface History {
  undo(): boolean
  redo(): boolean
  canUndo(): boolean
  canRedo(): boolean
  onChange(cb: () => void): () => void
  destroy(): void
}

/** Undo and redo for this peer's own commands only. Remote and sanitizer edits are never undone. */
export function createHistory(doc: Y.Doc): History {
  const { shapes, order } = getBoard(doc)
  const um = new Y.UndoManager([shapes, order], { trackedOrigins: new Set([ORIGIN_LOCAL]), captureTimeout: 0 })
  const events = ['stack-item-added', 'stack-item-popped', 'stack-cleared'] as const
  return {
    undo: () => um.undo() !== null,
    redo: () => um.redo() !== null,
    canUndo: () => um.canUndo(),
    canRedo: () => um.canRedo(),
    onChange(cb) {
      events.forEach((e) => um.on(e, cb))
      return () => events.forEach((e) => um.off(e, cb))
    },
    destroy: () => um.destroy(),
  }
}
