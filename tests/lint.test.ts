import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, dirname, sep } from 'node:path'
import { parseSync } from 'oxc-parser'

const ROOT = resolve(import.meta.dirname, '..')
const SRC = join(ROOT, 'src')
const ALLOWED_TRANSACT = new Set(['src/doc/commands.ts', 'src/doc/sanitize.ts'])

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(name) ? [p] : []
  })
}

type Node = { type?: string; [k: string]: unknown }

function visit(node: unknown, fn: (n: Node) => void): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) { node.forEach((n) => visit(n, fn)); return }
  const n = node as Node
  if (typeof n.type === 'string') fn(n)
  for (const k of Object.keys(n)) if (k !== 'parent') visit(n[k], fn)
}

/** Every member access named `transact`: a.transact, Y.transact, a['transact']. Returns source offsets. */
export function findTransact(filename: string, code: string): number[] {
  const { program, errors } = parseSync(filename, code)
  if (errors.length) throw new Error(`${filename}: parse error ${errors[0].message}`)
  const hits: number[] = []
  visit(program, (n) => {
    if (n.type !== 'MemberExpression') return
    const p = n.property as Node & { name?: string; value?: unknown }
    if ((p.type === 'Identifier' && p.name === 'transact') || (p.type === 'Literal' && p.value === 'transact')) hits.push(n.start as number)
  })
  return hits
}

/** Relative import specifiers in a file. */
function relativeImports(filename: string, code: string): string[] {
  const { program } = parseSync(filename, code)
  const out: string[] = []
  visit(program, (n) => {
    if ((n.type === 'ImportDeclaration' || n.type === 'ExportNamedDeclaration' || n.type === 'ExportAllDeclaration' || n.type === 'ImportExpression') && n.source) {
      const v = (n.source as { value?: unknown }).value
      if (typeof v === 'string' && v.startsWith('.')) out.push(v)
    }
  })
  return out
}

const rel = (p: string) => relative(ROOT, p).split(sep).join('/')

describe('architecture lint', () => {
  it('the scanner finds all three call forms (self-test)', () => {
    const code = "import * as Y from 'yjs'\nexport function f(doc: Y.Doc) { doc.transact(() => {}); Y.transact(doc, () => {}); const t = doc['transact'] }"
    expect(findTransact('fixture.ts', code)).toHaveLength(3)
  })

  it('only commands.ts and sanitize.ts call transact', () => {
    const files = walk(SRC)
    expect(files.length).toBeGreaterThan(0)
    const offenders = files
      .filter((f) => !ALLOWED_TRANSACT.has(rel(f)))
      .filter((f) => findTransact(f, readFileSync(f, 'utf8')).length > 0)
      .map(rel)
    expect(offenders).toEqual([])
  })

  it('src/crdt-core imports nothing from the rest of src', () => {
    const core = join(SRC, 'crdt-core')
    let files: string[] = []
    try { files = walk(core) } catch { files = [] }
    const leaks = files.flatMap((f) =>
      relativeImports(f, readFileSync(f, 'utf8'))
        .filter((spec) => !resolve(dirname(f), spec).startsWith(core))
        .map((spec) => `${rel(f)} -> ${spec}`),
    )
    expect(leaks).toEqual([])
  })
})
