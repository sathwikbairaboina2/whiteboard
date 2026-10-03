import { readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'

const node = JSON.parse(readFileSync('bench/results/node.json', 'utf8'))
const browser = JSON.parse(readFileSync('bench/results/browser.json', 'utf8'))

const results = {
  date: new Date().toISOString(),
  machine: {
    cpu: os.cpus()[0].model.trim(),
    cores: os.cpus().length,
    os: `${os.platform()} ${os.release()}`,
    node: process.version,
    chromium: browser.chromium as string,
  },
  node,
  browser,
}

writeFileSync('bench/results.json', JSON.stringify(results, null, 2) + '\n')
console.log(`HEADLINE: ${browser.pan10k.paintP95Ms} ms p95 paint per frame panning 10,000 shapes (Chromium ${results.machine.chromium}, ${results.machine.cpu})`)
