import { expect, test } from '@playwright/test'
import { drag, QUERY, shapeCount } from './helpers'

test('opening / again returns to the last board on this device', async ({ page }) => {
  await page.goto(`/${QUERY}`)
  await expect(page.getByTestId('board')).toBeVisible()
  const hash = await page.evaluate(() => location.hash)
  expect(hash).toMatch(/^#room=[\w-]{12}&key=[\w-]{22}$/)

  await page.getByTestId('tool-rect').click()
  await drag(page, [100, 100], [260, 200])
  await expect.poll(() => shapeCount(page)).toBe('1')
  await page.waitForTimeout(300)

  await page.goto(`/${QUERY}`)
  await expect(page.getByTestId('board')).toBeVisible()
  expect(await page.evaluate(() => location.hash)).toBe(hash)
  await expect.poll(() => shapeCount(page)).toBe('1')
})
