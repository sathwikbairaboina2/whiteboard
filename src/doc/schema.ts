import { z } from 'zod'

export const LIMITS = {
  maxShapes: 20_000,
  maxPointPairs: 4_000,
  maxCoord: 1e6,
  maxSize: 1e5,
  maxPointCoord: 1e5,
  minStrokeWidth: 0.5,
  maxStrokeWidth: 32,
} as const

export type LimitName = keyof typeof LIMITS

export const SHAPE_TYPES = ['rect', 'ellipse', 'freehand'] as const
export type ShapeType = (typeof SHAPE_TYPES)[number]

export const ColorSchema = z.union([z.string().regex(/^#[0-9a-f]{6}$/), z.literal('transparent')])
export const ShapeIdSchema = z.string().regex(/^[A-Za-z0-9_-]{12}$/)

/** A stored shape. z.number() rejects NaN and +/-Infinity in zod 4. */
export const ShapeSchema = z.object({
  id: ShapeIdSchema,
  type: z.enum(SHAPE_TYPES),
  x: z.number(),
  y: z.number(),
  w: z.number().min(0),
  h: z.number().min(0),
  rotation: z.number(),
  stroke: ColorSchema,
  fill: ColorSchema,
  strokeWidth: z.number(),
  points: z.array(z.number()).optional(),
  createdBy: z.string(),
})
export type Shape = z.infer<typeof ShapeSchema>

/** Input to addShape. Sizes may be negative (drag up or left); commands normalise them. */
export const NewShapeSchema = z.object({
  id: ShapeIdSchema.optional(),
  type: z.enum(SHAPE_TYPES),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  stroke: ColorSchema.default('#1e1e1e'),
  fill: ColorSchema.default('transparent'),
  strokeWidth: z.number().default(2),
  points: z.array(z.number()).optional(),
})
export type NewShape = z.input<typeof NewShapeSchema>

export const StylePatchSchema = z.object({
  stroke: ColorSchema.optional(),
  fill: ColorSchema.optional(),
  strokeWidth: z.number().optional(),
})
export type StylePatch = z.input<typeof StylePatchSchema>

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** Structural check used by the renderer. Returns null for anything it must not draw. */
export function parseShape(raw: unknown): Shape | null {
  const r = ShapeSchema.safeParse(raw)
  if (!r.success) return null
  const s = r.data
  if (s.type === 'freehand') {
    if (!s.points || s.points.length < 2 || s.points.length % 2 !== 0) return null
  } else if (s.points !== undefined) return null
  return s
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** World-space bounds, padded by half the stroke width. */
export function shapeBounds(s: Shape): Bounds {
  const pad = s.strokeWidth / 2
  return { minX: s.x - pad, minY: s.y - pad, maxX: s.x + s.w + pad, maxY: s.y + s.h + pad }
}
