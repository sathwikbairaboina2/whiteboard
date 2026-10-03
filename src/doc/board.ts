import * as Y from 'yjs'

/** Origin of every transaction made by the command layer. UndoManager tracks only this. */
export const ORIGIN_LOCAL = 'local'
/** Origin of repairs made by the sanitizer. */
export const ORIGIN_SANITIZER = 'sanitizer'

export type ShapeMap = Y.Map<unknown>

export interface Board {
  doc: Y.Doc
  shapes: Y.Map<ShapeMap>
  order: Y.Array<string>
}

export function getBoard(doc: Y.Doc): Board {
  return { doc, shapes: doc.getMap<ShapeMap>('shapes'), order: doc.getArray<string>('order') }
}
