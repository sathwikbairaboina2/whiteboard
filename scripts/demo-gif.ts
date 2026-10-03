import { mkdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

mkdirSync('docs/media', { recursive: true })

const r = spawnSync(
  'docker',
  [
    'run', '--rm', '--name', 'whiteboard-ffmpeg',
    '-v', `${resolve('test-results/demo')}:/in`,
    '-v', `${resolve('docs/media')}:/out`,
    'jrottenberg/ffmpeg:7.1-alpine',
    '-y', '-i', '/in/a.webm', '-i', '/in/b.webm',
    '-filter_complex', '[0:v][1:v]hstack=inputs=2,fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
    '/out/demo.gif',
  ],
  { stdio: 'inherit', env: { ...process.env, MSYS_NO_PATHCONV: '1' } },
)
if (r.status !== 0) {
  console.error('ffmpeg failed')
  process.exit(r.status ?? 1)
}
console.log(`docs/media/demo.gif ${(statSync('docs/media/demo.gif').size / 1024 / 1024).toFixed(2)} MB`)
