export interface FrameScheduler {
  /** Ask for a repaint on the next animation frame. Many calls in one frame paint once. */
  invalidate(): void
  destroy(): void
}

export function createFrameScheduler(
  frame: () => void,
  raf: (cb: FrameRequestCallback) => number = requestAnimationFrame,
  caf: (id: number) => void = cancelAnimationFrame,
): FrameScheduler {
  let pending: number | null = null
  return {
    invalidate() {
      if (pending !== null) return
      pending = raf(() => { pending = null; frame() })
    },
    destroy() {
      if (pending !== null) caf(pending)
      pending = null
    },
  }
}
