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
