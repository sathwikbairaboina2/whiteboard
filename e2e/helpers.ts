import { expect, type Page } from '@playwright/test'

export const ROOM = (tag: string) => {
  const tail = Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 4)
  const id = (tag.slice(0, 4).replace(/[^A-Za-z0-9]/g, 'x') + tail).padEnd(12, 'x').slice(0, 12)
  return `#room=${id}&key=e2ekeye2ekeye2ekeye2ek`
}
export const QUERY = '?signaling=ws://localhost:5415&ice=none'

export async function openBoard(page: Page, hash: string, extraQuery = ''): Promise<void> {
  await page.goto(`/${QUERY}${extraQuery}${hash}`)
  await expect(page.getByTestId('board')).toBeVisible()
}

export const shapeCount = (page: Page) => page.getByTestId('board').getAttribute('data-shapes')

/** Drag on the canvas in screen coordinates relative to the canvas. */
export async function drag(page: Page, from: [number, number], to: [number, number]): Promise<void> {
  const box = (await page.getByTestId('board').boundingBox())!
  await page.mouse.move(box.x + from[0], box.y + from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + (from[0] + to[0]) / 2, box.y + (from[1] + to[1]) / 2, { steps: 4 })
  await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 4 })
  await page.mouse.up()
}
