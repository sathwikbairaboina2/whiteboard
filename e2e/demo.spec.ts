import { expect, test, type Page } from '@playwright/test'
import { openBoard, ROOM, shapeCount } from './helpers'

const SIZE = { width: 640, height: 420 }

/** A visible drag: many small steps so the recording shows motion. */
async function slowDrag(page: Page, points: Array<[number, number]>): Promise<void> {
  const box = (await page.getByTestId('board').boundingBox())!
  await page.mouse.move(box.x + points[0][0], box.y + points[0][1])
  await page.mouse.down()
  for (const [x, y] of points.slice(1)) await page.mouse.move(box.x + x, box.y + y, { steps: 12 })
  await page.mouse.up()
}

test('@demo two boards, live and offline', async ({ browser }) => {
  const room = ROOM('demo' + Date.now())
  const opts = { viewport: SIZE, recordVideo: { dir: 'test-results/demo', size: SIZE } }
  const ctxA = await browser.newContext(opts)
  const ctxB = await browser.newContext(opts)
  const a = await ctxA.newPage()
  const b = await ctxB.newPage()
  await openBoard(a, room, '&hook=1')
  await openBoard(b, room, '&hook=1')
  await expect(a.getByTestId('peer-count')).toHaveText('1 peer', { timeout: 20_000 })
  await expect(b.getByTestId('peer-count')).toHaveText('1 peer', { timeout: 20_000 })
  await a.waitForTimeout(600)

  await a.getByTestId('tool-rect').click()
  await slowDrag(a, [[60, 90], [220, 190]])
  await a.waitForTimeout(600)

  await b.getByTestId('tool-ellipse').click()
  await slowDrag(b, [[300, 120], [440, 220]])
  await b.waitForTimeout(600)

  await a.getByTestId('tool-freehand').click()
  await slowDrag(a, [[100, 260], [160, 230], [220, 280], [280, 240], [340, 290]])
  await a.waitForTimeout(600)

  // A real disconnect: setOffline does not block loopback WebRTC, so the hook closes the peer connection.
  await b.evaluate(() => (window as unknown as { __session: { disconnect(): void } }).__session.disconnect())
  await expect(b.getByTestId('peer-count')).toHaveText('Only you', { timeout: 5000 })
  await a.getByTestId('tool-rect').click()
  await slowDrag(a, [[470, 40], [580, 95]])
  await b.getByTestId('tool-rect').click()
  await slowDrag(b, [[440, 260], [560, 340]])
  await b.waitForTimeout(800)
  expect(await shapeCount(a)).toBe('4') // B's offline shape is not on A yet
  await b.evaluate(() => (window as unknown as { __session: { reconnect(): void } }).__session.reconnect())
  await expect(b.getByTestId('peer-count')).toHaveText('1 peer', { timeout: 30_000 })
  await expect.poll(() => shapeCount(a), { timeout: 10_000 }).toBe('5')
  await expect.poll(() => shapeCount(b), { timeout: 10_000 }).toBe('5')
  await a.waitForTimeout(1200)

  await ctxA.close()
  await ctxB.close()
  await a.video()!.saveAs('test-results/demo/a.webm')
  await b.video()!.saveAs('test-results/demo/b.webm')
})
