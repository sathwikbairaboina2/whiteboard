import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

type Bench = {
  pan(o: { shapes: number; frames: number; zoom: number }): Promise<Record<string, number>>
  peers(): number
  send(n: number, gapMs: number): Promise<Record<string, number>>
  received(): Record<string, number>
}
declare const window: { __bench: Bench }

const q = (sorted: number[], p: number): number => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
const round2 = (v: number): number => Math.round(v * 100) / 100

test('browser benchmarks', async ({ browser }) => {
  const out: Record<string, unknown> = { chromium: browser.version() }

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto('/bench.html')
  await page.waitForFunction(() => Boolean(window.__bench))
  out.pan10k = await page.evaluate(() => window.__bench.pan({ shapes: 10000, frames: 300, zoom: 1 }))
  out.fit10k = await page.evaluate(() => window.__bench.pan({ shapes: 10000, frames: 300, zoom: 0.16 }))
  await page.close()

  const id = Array.from({ length: 12 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('')
  const url = `/bench.html?mode=peer&signaling=ws://localhost:5415&ice=none#room=${id}&key=benchkeybenchkeybench1`
  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const a = await ctxA.newPage()
  const b = await ctxB.newPage()
  await a.goto(url)
  await b.goto(url)
  await a.waitForFunction(() => window.__bench?.peers() === 1, undefined, { timeout: 30_000 })
  await b.waitForFunction(() => window.__bench?.peers() === 1, undefined, { timeout: 30_000 })
  const sent = await a.evaluate(() => window.__bench.send(50, 100))
  await b.waitForFunction(() => Object.keys(window.__bench.received()).length >= 50, undefined, { timeout: 30_000 })
  const got = await b.evaluate(() => window.__bench.received())
  const lat = Object.keys(sent).map((k) => got[k] - sent[k]).sort((x, y) => x - y)
  expect(lat).toHaveLength(50)
  out.peerLatency = { edits: 50, p50Ms: round2(q(lat, 0.5)), p95Ms: round2(q(lat, 0.95)) }
  await ctxA.close()
  await ctxB.close()

  mkdirSync('bench/results', { recursive: true })
  writeFileSync('bench/results/browser.json', JSON.stringify(out, null, 2))
  console.log(JSON.stringify(out))
})
