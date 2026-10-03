import { expect, test } from '@playwright/test'
import { openBoard, ROOM } from './helpers'

test('chromium reports no installability errors', async ({ page, context }) => {
  await openBoard(page, ROOM('pwa' + Date.now()))
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  const cdp = await context.newCDPSession(page)
  const { installabilityErrors } = (await cdp.send('Page.getInstallabilityErrors' as never)) as { installabilityErrors: unknown[] }
  expect(installabilityErrors).toEqual([])
  const manifest = await (await page.request.get('/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ name: 'Whiteboard', display: 'standalone', start_url: '/' })
})
