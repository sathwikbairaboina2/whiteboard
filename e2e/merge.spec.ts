import { expect, test } from '@playwright/test'
import { drag, openBoard, ROOM, shapeCount } from './helpers'

// Playwright's setOffline does not stop loopback WebRTC, so the debug hook (?debug=1)
// closes the peer connection for real.
test('edits made while disconnected merge after reconnecting', async ({ browser }) => {
  const room = ROOM('merge')
  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const a = await ctxA.newPage()
  const b = await ctxB.newPage()
  await openBoard(a, room, '&debug=1')
  await openBoard(b, room, '&debug=1')
  await expect(a.getByTestId('peer-count')).toHaveText('1 peer', { timeout: 20_000 })
  await expect(b.getByTestId('peer-count')).toHaveText('1 peer', { timeout: 20_000 })

  await a.getByTestId('tool-rect').click()
  await drag(a, [60, 80], [180, 160])
  await expect.poll(() => shapeCount(b), { timeout: 5000 }).toBe('1')

  await b.evaluate(() => (window as unknown as { __session: { disconnect(): void } }).__session.disconnect())
  await expect(b.getByTestId('peer-count')).toHaveText('Only you', { timeout: 5000 })

  await a.getByTestId('tool-ellipse').click()
  await drag(a, [260, 100], [380, 180])
  await b.getByTestId('tool-rect').click()
  await drag(b, [100, 260], [240, 340])
  await expect.poll(() => shapeCount(a)).toBe('2')
  await expect.poll(() => shapeCount(b)).toBe('2')
  await a.waitForTimeout(1500)
  expect(await shapeCount(a)).toBe('2') // B's offline shape has not reached A
  expect(await shapeCount(b)).toBe('2') // and A's has not reached B

  await b.evaluate(() => (window as unknown as { __session: { reconnect(): void } }).__session.reconnect())
  await expect(b.getByTestId('peer-count')).toHaveText('1 peer', { timeout: 30_000 })
  await expect.poll(() => shapeCount(a), { timeout: 10_000 }).toBe('3')
  await expect.poll(() => shapeCount(b), { timeout: 10_000 }).toBe('3')

  await ctxA.close()
  await ctxB.close()
})
