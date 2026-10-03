import { expect, it } from 'vitest'
import * as Y from 'yjs'

it('yjs loads', () => {
  expect(new Y.Doc().getMap('shapes').size).toBe(0)
})
