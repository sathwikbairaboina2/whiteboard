import { expect, test } from '@playwright/test'
import { drag, openBoard, ROOM, shapeCount } from './helpers'

test('a fresh visit gets a room link in the URL fragment', async ({ page }) => {
  await page.goto('/?signaling=ws://localhost:5415&ice=none')
  await expect(page.getByTestId('board')).toBeVisible()
  expect(page.url()).toContain('#room=')
  expect(page.url()).toContain('&key=')
})

test('draw, undo, redo, freehand, select and delete', async ({ page }) => {
  await openBoard(page, ROOM('draw' + Date.now()))
  await expect.poll(() => shapeCount(page)).toBe('0')

  await page.getByTestId('tool-rect').click()
  await drag(page, [100, 100], [260, 200])
  await expect.poll(() => shapeCount(page)).toBe('1')

  await page.keyboard.press('Control+z')
  await expect.poll(() => shapeCount(page)).toBe('0')
  await page.keyboard.press('Control+Shift+z')
  await expect.poll(() => shapeCount(page)).toBe('1')

  await page.getByTestId('tool-freehand').click()
  await drag(page, [400, 300], [520, 360])
  await expect.poll(() => shapeCount(page)).toBe('2')

  await page.keyboard.press('v')
  const box = (await page.getByTestId('board').boundingBox())!
  await page.mouse.click(box.x + 180, box.y + 150)
  await page.keyboard.press('Delete')
  await expect.poll(() => shapeCount(page)).toBe('1')
})
