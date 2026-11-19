import { nextStep } from './geometry.js';
import type { ScrollTarget } from './target.js';
import { AXES, type Axis } from './types.js';

const EXTERNAL_DELTA_THRESHOLD = 2;

interface GlideRun {
  goal: number;
  written: number | null;
}

/**
 * Additive per-axis scroll glide used for arrow button presses, track paging,
 * track jumps, and marker navigation. Automatically yields whenever an external
 * scroll source (wheel, touch, keys, or script) moves the scroller.
 */
export class Glide {
  readonly #runs: Record<Axis, GlideRun | null> = { vertical: null, horizontal: null };

  constructor(
    private readonly target: ScrollTarget,
    private readonly tau: () => number,
  ) {}

  get running(): boolean {
    return this.#runs.vertical !== null || this.#runs.horizontal !== null;
  }

  goal(axis: Axis): number | null {
    return this.#runs[axis]?.goal ?? null;
  }

  /** Adds `delta` onto the active goal (or current scroll position). */
  by(axis: Axis, delta: number): void {
    const run = this.#runs[axis];
    this.to(axis, (run ? run.goal : this.target.position(axis)) + delta);
  }

  to(axis: Axis, logical: number): void {
    const max = Math.max(0, this.target.size(axis) - this.target.client(axis));
    const goal = Math.min(Math.max(logical, 0), max);
    if (this.tau() <= 0) {
      this.#runs[axis] = null;
      this.target.scrollTo(axis, goal);
      return;
    }
    const run = this.#runs[axis];
    if (run) run.goal = goal;
    else this.#runs[axis] = { goal, written: null };
  }

  stop(axis?: Axis): void {
    for (const each of axis ? [axis] : AXES) {
      this.#runs[each] = null;
    }
  }

  step(dt: number): void {
    for (const axis of AXES) {
      const run = this.#runs[axis];
      if (!run) continue;
      const at = this.target.position(axis);
      if (run.written !== null && Math.abs(at - run.written) > EXTERNAL_DELTA_THRESHOLD) {
        this.#runs[axis] = null;
        continue;
      }
      const next = nextStep(at, run.goal, dt, this.tau());
      this.target.scrollTo(axis, next.at);
      run.written = next.at;
      if (next.done) this.#runs[axis] = null;
    }
  }
}
