import { expect, test } from '@playwright/test'
import { drag, openBoard, ROOM, shapeCount } from './helpers'

test('the board reloads and keeps working offline', async ({ page, context }) => {
  const room = ROOM('offline' + Date.now())
  await openBoard(page, room)
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await page.reload()
  await expect(page.getByTestId('board')).toBeVisible()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)

  await page.getByTestId('tool-rect').click()
  await drag(page, [100, 100], [260, 200])
  await expect.poll(() => shapeCount(page)).toBe('1')
  await page.waitForTimeout(300)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('board')).toBeVisible()
  await expect.poll(() => shapeCount(page)).toBe('1')
  await expect(page.getByTestId('net-status')).toHaveText('Offline')

  await page.getByTestId('tool-ellipse').click()
  await drag(page, [300, 250], [420, 330])
  await expect.poll(() => shapeCount(page)).toBe('2')
  await page.waitForTimeout(300)

  await page.reload()
  await expect(page.getByTestId('board')).toBeVisible()
  await expect.poll(() => shapeCount(page)).toBe('2')
})
