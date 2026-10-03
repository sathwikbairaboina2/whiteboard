import type * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'

export interface Persistence {
  /** Resolves once everything stored locally has been applied to the doc. */
  whenSynced: Promise<void>
  destroy(): Promise<void>
}

export const dbName = (roomId: string): string => `whiteboard:${roomId}`

export function attachPersistence(doc: Y.Doc, roomId: string): Persistence {
  const idb = new IndexeddbPersistence(dbName(roomId), doc)
  return {
    whenSynced: idb.whenSynced.then(() => undefined),
    destroy: () => idb.destroy(),
  }
}
