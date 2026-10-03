import { shapeBounds, type Bounds, type Shape } from '../doc/schema'
import { intersects } from './geometry'

export interface SceneInput {
  shapes: ReadonlyMap<string, Shape>
  order: readonly string[]
}

/**
 * Valid shapes bottom to top. Ids in `order` without a valid shape are skipped, duplicates keep
 * their first position, and valid shapes missing from `order` go on top sorted by id.
 */
export function zOrdered(input: SceneInput): Shape[] {
  const out: Shape[] = []
  const seen = new Set<string>()
  for (const id of input.order) {
    if (seen.has(id)) continue
    const s = input.shapes.get(id)
    if (s) { out.push(s); seen.add(id) }
  }
  const rest = [...input.shapes.keys()].filter((id) => !seen.has(id)).sort()
  for (const id of rest) out.push(input.shapes.get(id)!)
  return out
}

/**
 * The render list: z-ordered shapes that overlap the viewport. Pure.
 * `visible` is an optional candidate set from the spatial index; when given it replaces the bounds test.
 */
export function buildScene(input: SceneInput, viewport: Bounds, visible?: ReadonlySet<string>): Shape[] {
  return zOrdered(input).filter((s) => (visible ? visible.has(s.id) : intersects(shapeBounds(s), viewport)))
}
