import { expect, test } from '@playwright/test'
import { drag, openBoard, ROOM, shapeCount } from './helpers'

test('two separate browser contexts sync over WebRTC', async ({ browser }) => {
  const room = ROOM('sync' + Date.now())
  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const a = await ctxA.newPage()
  const b = await ctxB.newPage()
  await openBoard(a, room)
  await openBoard(b, room)

  await expect(a.getByTestId('peer-count')).toHaveText('1 peer', { timeout: 20_000 })
  await expect(b.getByTestId('peer-count')).toHaveText('1 peer', { timeout: 20_000 })

  await a.getByTestId('tool-rect').click()
  await drag(a, [100, 100], [260, 200])
  await expect.poll(() => shapeCount(b), { timeout: 5000 }).toBe('1')

  await b.getByTestId('tool-ellipse').click()
  await drag(b, [300, 250], [420, 330])
  await expect.poll(() => shapeCount(a), { timeout: 5000 }).toBe('2')

  await ctxA.close()
  await ctxB.close()
})
