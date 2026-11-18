import { isServer } from '@kerno/core';

export type FrameTask = () => void;

const queue = new Set<FrameTask>();
let rafId: number | null = null;

function runFrame(): void {
  rafId = null;
  const tasks = [...queue];
  queue.clear();
  for (const task of tasks) {
    task();
  }
}

/**
 * Schedules `task` to run in the shared global animation frame. Multiple calls
 * with the same function reference within one frame are coalesced.
 */
export function scheduleFrame(task: FrameTask): void {
  queue.add(task);
  if (rafId !== null || isServer) return;
  if (typeof requestAnimationFrame === 'function') {
    rafId = requestAnimationFrame(runFrame);
  } else {
    queueMicrotask(runFrame);
  }
}

/** Removes a pending task from the next frame batch. */
export function cancelFrame(task: FrameTask): void {
  queue.delete(task);
  if (queue.size === 0 && rafId !== null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

/** Synchronously flushes all scheduled frame tasks (useful in tests and initial layout). */
export function flushFrames(): void {
  if (rafId !== null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (queue.size > 0) runFrame();
}
