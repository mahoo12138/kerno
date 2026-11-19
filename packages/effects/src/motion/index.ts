import { isServer } from '@kerno/core';
import { baseTokens, tokenName, type MotionTokens } from '@kerno/tokens';

export type MotionDuration = keyof MotionTokens['duration'];
export type MotionEasing = keyof MotionTokens['easing'];

export interface KernoAnimateOptions {
  /** Logical slot name on the element; starting a new animation with the same id cancels the previous one. */
  id?: string;
  /** Semantic duration token name (`'fast' | 'normal' | ...`) or raw milliseconds. Defaults to `'normal'`. */
  duration?: MotionDuration | number;
  /** Semantic easing token name (`'standard' | 'decelerate' | ...`) or raw CSS easing string. Defaults to `'standard'`. */
  easing?: MotionEasing | string;
  delay?: number;
  fill?: FillMode;
  /** Explicit override for reduced-motion testing. */
  reducedMotion?: boolean;
}

export interface MotionHandle {
  readonly animation: Animation | null;
  readonly duration: number;
  readonly easing: string;
  readonly finished: Promise<void>;
  cancel(): void;
  finish(): void;
}

const DEFAULT_DURATIONS: Record<MotionDuration, number> = {
  instant: 0,
  fast: 83,
  normal: 167,
  slow: 250,
  slower: 333,
};

const DEFAULT_EASINGS: Record<MotionEasing, string> = baseTokens.motion.easing;

export type CubicBezierTuple = readonly [number, number, number, number];

export type WindowsEasingId =
  | 'fast-out-slow-in'
  | 'slow-out-fast-in'
  | 'fast-out-linear-in'
  | 'linear-out-slow-in'
  | 'direct-enter'
  | 'gravity-bounce'
  | 'minimal-overshoot'
  | 'moderate-overshoot'
  | 'maximal-overshoot'
  | 'spring-in-out'
  | 'linear';

/**
 * Windows 10 / WinUI 3 canonical motion curves (`ax-design/surface/src/easing.ts`).
 */
export const WINDOWS_EASINGS: Readonly<Record<WindowsEasingId, CubicBezierTuple>> = {
  'fast-out-slow-in': [0.1, 0.9, 0.2, 1],
  'slow-out-fast-in': [0.9, 0.1, 1, 0.2],
  'fast-out-linear-in': [0.7, 0, 1, 0.5],
  'linear-out-slow-in': [0, 0.5, 0.3, 1],
  'direct-enter': [0, 0, 0, 1],
  'gravity-bounce': [0.1, 0.25, 0.75, 0.9],
  'minimal-overshoot': [0.55, 0.55, 0, 1.07],
  'moderate-overshoot': [0.5, 0.5, 0, 1.15],
  'maximal-overshoot': [0.5, 0.5, 0, 1.2],
  'spring-in-out': [0.5, -0.5, 0.5, 1.5],
  linear: [0, 0, 1, 1],
};

/** Returns a CSS `cubic-bezier(...)` string for a canonical Windows 10 motion curve id. */
export function windowsEasing(id: WindowsEasingId): string {
  const [x1, y1, x2, y2] = WINDOWS_EASINGS[id];
  return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
}

/**
 * Parses a Windows easing id or CSS `cubic-bezier(...)` string into a 4-tuple.
 */
export function parseEasing(
  value: string,
  fallback: CubicBezierTuple = WINDOWS_EASINGS['fast-out-slow-in'],
): CubicBezierTuple {
  const s = value.trim();
  if (!s) return fallback;
  if (s in WINDOWS_EASINGS) return WINDOWS_EASINGS[s as WindowsEasingId];
  const m = /^cubic-bezier\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i.exec(s);
  if (m) {
    const x1 = Number(m[1]);
    const y1 = Number(m[2]);
    const x2 = Number(m[3]);
    const y2 = Number(m[4]);
    if (
      Number.isFinite(x1) &&
      Number.isFinite(y1) &&
      Number.isFinite(x2) &&
      Number.isFinite(y2) &&
      x1 >= 0 &&
      x1 <= 1 &&
      x2 >= 0 &&
      x2 <= 1
    ) {
      return [x1, y1, x2, y2];
    }
  }
  return fallback;
}

/** Evaluates a cubic-bezier curve at normalized progress `t` in `[0, 1]`. */
export function bezierAt(curve: CubicBezierTuple, t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const [x1, y1, x2, y2] = curve;
  if (x1 === y1 && x2 === y2) return t;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  let u = t;
  for (let i = 0; i < 6; i++) {
    const x = ((ax * u + bx) * u + cx) * u - t;
    if (Math.abs(x) < 1e-6) break;
    const dx = (3 * ax * u + 2 * bx) * u + cx;
    if (Math.abs(dx) < 1e-6) break;
    u -= x / dx;
  }
  if (u < 0 || u > 1) {
    let lo = 0;
    let hi = 1;
    u = t;
    for (let i = 0; i < 12; i++) {
      const x = ((ax * u + bx) * u + cx) * u;
      if (Math.abs(x - t) < 1e-6) break;
      if (x < t) lo = u;
      else hi = u;
      u = (lo + hi) * 0.5;
    }
  }
  return ((ay * u + by) * u + cy) * u;
}

/** Checks whether reduced motion is requested by the user or explicit override. */
export function prefersReducedMotion(override?: boolean): boolean {
  if (typeof override === 'boolean') return override;
  if (isServer || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Converts a CSS time string (`"167ms"`, `"0.25s"`) or number into milliseconds. */
export function parseDurationMs(value: string | number, fallback = 167): number {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, value) : fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const num = Number.parseFloat(trimmed);
  if (!Number.isFinite(num)) return fallback;
  if (trimmed.endsWith('ms')) return Math.max(0, num);
  if (trimmed.endsWith('s')) return Math.max(0, num * 1000);
  return Math.max(0, num);
}

/**
 * Resolves a duration in milliseconds from an element's computed `--k-motion-duration-*`
 * token, collapsing to `0` when reduced motion is active.
 */
export function resolveDurationMs(
  el: Element,
  duration: MotionDuration | number = 'normal',
  reducedMotion?: boolean,
): number {
  if (prefersReducedMotion(reducedMotion)) return 0;
  if (typeof duration === 'number') return Math.max(0, duration);
  const fallback = DEFAULT_DURATIONS[duration] ?? 167;
  if (isServer || typeof getComputedStyle === 'undefined') return fallback;
  const raw = getComputedStyle(el)
    .getPropertyValue(tokenName(`motion.duration.${duration}` as const))
    .trim();
  return raw ? parseDurationMs(raw, fallback) : fallback;
}

/**
 * Resolves a CSS timing-function from an element's computed `--k-motion-easing-*` token.
 */
export function resolveEasing(el: Element, easing: MotionEasing | string = 'standard'): string {
  if (!(easing in DEFAULT_EASINGS)) return easing;
  const key = easing as MotionEasing;
  const fallback = DEFAULT_EASINGS[key];
  if (isServer || typeof getComputedStyle === 'undefined') return fallback;
  const raw = getComputedStyle(el)
    .getPropertyValue(tokenName(`motion.easing.${key}` as const))
    .trim();
  return raw || fallback;
}

const activeAnimations = new WeakMap<Element, Map<string, Animation>>();

/**
 * Runs a Web Animations API transition driven by Kerno motion tokens, cancelling
 * any in-flight animation with the same `id` on `el`.
 */
export function animate(
  el: HTMLElement,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options: KernoAnimateOptions = {},
): MotionHandle {
  const duration = resolveDurationMs(el, options.duration ?? 'normal', options.reducedMotion);
  const easing = resolveEasing(el, options.easing ?? 'standard');
  const slotId = options.id ?? 'default';

  let slots = activeAnimations.get(el);
  const prev = slots?.get(slotId);
  if (prev) {
    try {
      prev.cancel();
    } catch {
      // Ignore already-settled animations.
    }
  }

  if (isServer || typeof el.animate !== 'function') {
    return {
      animation: null,
      duration,
      easing,
      finished: Promise.resolve(),
      cancel() {},
      finish() {},
    };
  }

  const animation = el.animate(keyframes, {
    duration,
    easing,
    delay: options.delay ?? 0,
    fill: options.fill ?? 'both',
  });

  if (!slots) activeAnimations.set(el, (slots = new Map()));
  slots.set(slotId, animation);

  const finished = animation.finished
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      if (slots?.get(slotId) === animation) slots.delete(slotId);
    });

  return {
    animation,
    duration,
    easing,
    finished,
    cancel: () => animation.cancel(),
    finish: () => animation.finish(),
  };
}

export function fadeIn(el: HTMLElement, options: KernoAnimateOptions = {}): MotionHandle {
  return animate(el, [{ opacity: 0 }, { opacity: 1 }], {
    id: 'fade',
    duration: 'fast',
    easing: 'decelerate',
    ...options,
  });
}

export function fadeOut(el: HTMLElement, options: KernoAnimateOptions = {}): MotionHandle {
  return animate(el, [{ opacity: 1 }, { opacity: 0 }], {
    id: 'fade',
    duration: 'fast',
    easing: 'accelerate',
    ...options,
  });
}

export function scaleIn(el: HTMLElement, options: KernoAnimateOptions = {}): MotionHandle {
  return animate(
    el,
    [
      { opacity: 0, transform: 'scale(0.95)' },
      { opacity: 1, transform: 'scale(1)' },
    ],
    { id: 'scale', duration: 'normal', easing: 'decelerate', ...options },
  );
}

export function scaleOut(el: HTMLElement, options: KernoAnimateOptions = {}): MotionHandle {
  return animate(
    el,
    [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(0.95)' },
    ],
    { id: 'scale', duration: 'fast', easing: 'accelerate', ...options },
  );
}

export function slideIn(
  el: HTMLElement,
  offset: { x?: number; y?: number } = { y: 8 },
  options: KernoAnimateOptions = {},
): MotionHandle {
  const dx = offset.x ?? 0;
  const dy = offset.y ?? 0;
  return animate(
    el,
    [
      { opacity: 0, transform: `translate3d(${dx}px, ${dy}px, 0)` },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' },
    ],
    { id: 'slide', duration: 'normal', easing: 'decelerate', ...options },
  );
}
