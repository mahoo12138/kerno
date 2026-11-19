import { isServer, type ReactiveController, type ReactiveControllerHost } from '@kerno/core';
import { tokenName } from '@kerno/tokens';
import { prefersReducedMotion } from '../motion/index.js';
import type { SurfaceLayer, SurfaceRenderState } from '../surface/layers.js';
import { cancelFrame, scheduleFrame } from '../surface/scheduler.js';

/** Default press animation duration in milliseconds while held (matches WinUI / Axiom). */
export const DEFAULT_PRESS_SPEED = 2000;
/** Default release acceleration multiplier (`1 + rate = 7×` after release, matches WinUI / Axiom). */
export const DEFAULT_RELEASE_ACCELERATE_RATE = 6;
/** Relative light radius factor against `Math.max(width, height)` when `size` is `'auto'`. */
const DEFAULT_RELATIVE_RADIUS_FACTOR = 1.5;

export interface RevealParams {
  color: string;
  borderColor: string;
  pressColor: string;
  pressRgb: string;
  pressOpacity: number;
  /** Fixed pixel radius when explicitly set, or `null` for relative `1.5 × max(w, h)`. */
  size: number | null;
  pressSpeed: number;
  releaseAccelerateRate: number;
}

const DEFAULT_REVEAL: RevealParams = {
  color: 'rgba(0, 0, 0, 0.13)',
  borderColor: 'rgba(0, 0, 0, 0.26)',
  pressColor: 'rgba(0, 0, 0, 0.4)',
  pressRgb: '0, 0, 0',
  pressOpacity: 0.4,
  size: null,
  pressSpeed: DEFAULT_PRESS_SPEED,
  releaseAccelerateRate: DEFAULT_RELEASE_ACCELERATE_RATE,
};

let colorProbeCtx: CanvasRenderingContext2D | null = null;

/**
 * Extracts `{ rgb: "r, g, b", alpha }` from any CSS color string.
 */
export function parseColorToRgba(color: string): { rgb: string; alpha: number } {
  const trimmed = color.trim();

  // Fast path: rgb(...) / rgba(...)
  const rgbMatch =
    /^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(
      trimmed,
    );
  if (rgbMatch) {
    const r = Math.round(Math.min(255, Math.max(0, Number(rgbMatch[1]))));
    const g = Math.round(Math.min(255, Math.max(0, Number(rgbMatch[2]))));
    const b = Math.round(Math.min(255, Math.max(0, Number(rgbMatch[3]))));
    let a = 1;
    if (rgbMatch[4] !== undefined) {
      a = rgbMatch[4].endsWith('%')
        ? Number.parseFloat(rgbMatch[4]) / 100
        : Number.parseFloat(rgbMatch[4]);
    }
    return {
      rgb: `${r}, ${g}, ${b}`,
      alpha: Number.isFinite(a) ? Math.min(1, Math.max(0, a)) : 1,
    };
  }

  // Fast path: #rgb / #rgba / #rrggbb / #rrggbbaa
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = Number.parseInt(hex[0]! + hex[0]!, 16);
      const g = Number.parseInt(hex[1]! + hex[1]!, 16);
      const b = Number.parseInt(hex[2]! + hex[2]!, 16);
      const a = hex.length === 4 ? Number.parseInt(hex[3]! + hex[3]!, 16) / 255 : 1;
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        return { rgb: `${r}, ${g}, ${b}`, alpha: Number.isNaN(a) ? 1 : a };
      }
    } else if (hex.length === 6 || hex.length === 8) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        return { rgb: `${r}, ${g}, ${b}`, alpha: Number.isNaN(a) ? 1 : a };
      }
    }
  }

  // Fallback for named colors, hsl(), color-mix(), etc.
  if (!isServer && typeof document !== 'undefined') {
    if (!colorProbeCtx) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      colorProbeCtx = canvas.getContext('2d', { willReadFrequently: true });
    }
    if (colorProbeCtx) {
      colorProbeCtx.clearRect(0, 0, 1, 1);
      colorProbeCtx.fillStyle = trimmed;
      colorProbeCtx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = colorProbeCtx.getImageData(0, 0, 1, 1).data;
      return { rgb: `${r}, ${g}, ${b}`, alpha: (a ?? 255) / 255 };
    }
  }

  return { rgb: '0, 0, 0', alpha: 0.4 };
}

function isForcedColors(): boolean {
  return (
    !isServer &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(forced-colors: active)').matches
  );
}

export function resolveRevealParams(el: Element): RevealParams {
  if (isServer || typeof getComputedStyle === 'undefined') return DEFAULT_REVEAL;
  const style = getComputedStyle(el);
  const color =
    style.getPropertyValue(tokenName('surface.reveal.color')).trim() || DEFAULT_REVEAL.color;
  const borderColor =
    style.getPropertyValue(tokenName('surface.reveal.borderColor')).trim() ||
    DEFAULT_REVEAL.borderColor;
  const pressColor =
    style.getPropertyValue(tokenName('surface.reveal.pressColor')).trim() ||
    DEFAULT_REVEAL.pressColor;
  const parsedPress = parseColorToRgba(pressColor);

  const rawSizeStr = style.getPropertyValue(tokenName('surface.reveal.size')).trim();
  const rawSize = rawSizeStr && rawSizeStr !== 'auto' ? Number.parseFloat(rawSizeStr) : Number.NaN;
  const size = Number.isFinite(rawSize) && rawSize > 0 ? rawSize : null;

  const rawSpeed = Number.parseFloat(
    style.getPropertyValue('--k-surface-reveal-press-speed').trim(),
  );
  const pressSpeed = Number.isFinite(rawSpeed) && rawSpeed > 0 ? rawSpeed : DEFAULT_PRESS_SPEED;

  const rawAccel = Number.parseFloat(
    style.getPropertyValue('--k-surface-reveal-release-accelerate').trim(),
  );
  const releaseAccelerateRate =
    Number.isFinite(rawAccel) && rawAccel >= 0 ? rawAccel : DEFAULT_RELEASE_ACCELERATE_RATE;

  return {
    color,
    borderColor,
    pressColor,
    pressRgb: parsedPress.rgb,
    pressOpacity: parsedPress.alpha,
    size,
    pressSpeed,
    releaseAccelerateRate,
  };
}

export interface PointerPoint {
  /** X coordinate relative to the surface's top-left corner. */
  x: number;
  /** Y coordinate relative to the surface's top-left corner. */
  y: number;
  /** Whether the pointer is strictly inside the surface bounding box. */
  inside: boolean;
}

export interface PressTimeline {
  startFrame: number | null;
  currentFrame: number | null;
  releasedFrame: number | null;
  logicFrame: number | null;
  pressed: boolean;
  released: boolean;
  hasUp: boolean;
  downX: number;
  downY: number;
  upX: number;
  upY: number;
}

/**
 * Advances the Fluent press ripple timeline (faithful port of
 * `@ax-design/reveal-highlight` `advancePressAnimation`): linear progression
 * over `speed` ms (default `2000`) while held, smoothly accelerated by
 * `(1 + accelerateRate)` (default `7×`) upon release. Returns `true` once
 * `logicFrame > 1`.
 */
export function advancePressAnimation(
  timeline: PressTimeline,
  now: number,
  speed = DEFAULT_PRESS_SPEED,
  accelerateRate = DEFAULT_RELEASE_ACCELERATE_RATE,
): boolean {
  if (timeline.startFrame === null) {
    timeline.startFrame = now;
  }
  const relativeFrame = now - timeline.startFrame;
  timeline.currentFrame = relativeFrame;

  let unitLogicFrame = relativeFrame;
  if (timeline.released && timeline.releasedFrame !== null) {
    unitLogicFrame += (relativeFrame - timeline.releasedFrame) * accelerateRate;
  }
  timeline.logicFrame = speed > 0 ? unitLogicFrame / speed : 1;
  return timeline.logicFrame > 1;
}

/**
 * Populates the 3-stop Fluent press ripple radial gradient (faithful port of
 * `@ax-design/reveal-highlight` `updateAnimateGrd`).
 *
 * As `frame` advances linearly from `0` to `1`:
 * - Center stop (`0`) dissolves from `opacity * 0.2` down to `0` by `frame = 0.2`.
 * - Mid wave stop (`outerBorder * 0.55`) gently decays from `opacity * 0.1` to `opacity * 0.03`.
 * - Outer edge (`outerBorder = 0.1 + frame * 0.8`) glides across the full cover radius (`0.1 → 0.9`).
 */
export function applyPressGradientStops(
  grd: CanvasGradient,
  rgb: string,
  opacity: number,
  frame: number,
): void {
  const _innerAlpha = opacity * (0.2 - frame);
  const _outerAlpha = opacity * (0.1 - frame * 0.07);
  const _outerBorder = 0.1 + frame * 0.8;

  const innerAlpha = _innerAlpha < 0 ? 0 : _innerAlpha;
  const outerAlpha = _outerAlpha < 0 ? 0 : _outerAlpha;
  const outerBorder = _outerBorder > 1 ? 1 : _outerBorder < 0 ? 0 : _outerBorder;

  grd.addColorStop(0, `rgba(${rgb}, ${innerAlpha})`);
  grd.addColorStop(outerBorder * 0.55, `rgba(${rgb}, ${outerAlpha})`);
  grd.addColorStop(outerBorder, `rgba(${rgb}, 0)`);
}

// ---------------------------------------------------------------------------
// Global shared pointer tracker (one listener + one frame batch for all surfaces)
// ---------------------------------------------------------------------------

const activeReveals = new Set<RevealController>();
let trackerListening = false;
let latestPointer: { clientX: number; clientY: number } | null = null;

function processPointerFrame(): void {
  const ptr = latestPointer;
  if (!ptr) {
    for (const ctrl of activeReveals) ctrl._clearFromTracker();
    return;
  }
  for (const ctrl of activeReveals) {
    ctrl._updateFromClientPoint(ptr.clientX, ptr.clientY);
  }
}

const onDocPointerMove = (event: PointerEvent): void => {
  latestPointer = { clientX: event.clientX, clientY: event.clientY };
  scheduleFrame(processPointerFrame);
};

const onDocPointerLeave = (): void => {
  latestPointer = null;
  scheduleFrame(processPointerFrame);
};

function registerReveal(ctrl: RevealController): void {
  if (isServer) return;
  activeReveals.add(ctrl);
  if (!trackerListening) {
    trackerListening = true;
    document.addEventListener('pointermove', onDocPointerMove, { passive: true });
    document.addEventListener('pointerleave', onDocPointerLeave, { passive: true });
  }
}

function unregisterReveal(ctrl: RevealController): void {
  activeReveals.delete(ctrl);
  if (activeReveals.size === 0 && trackerListening) {
    trackerListening = false;
    latestPointer = null;
    cancelFrame(processPointerFrame);
    document.removeEventListener('pointermove', onDocPointerMove);
    document.removeEventListener('pointerleave', onDocPointerLeave);
  }
}

/**
 * Tracks pointer position for a Reveal-enabled surface via a shared document
 * pointer tracker and frame-coalesced geometry checks, rendering Windows 10 /
 * Fluent hover light, proximity border highlight, and press ripple animations.
 */
export class RevealController implements ReactiveController {
  readonly host: ReactiveControllerHost & HTMLElement;
  readonly #onInvalidate: () => void;
  readonly #isVisible?: () => boolean;
  readonly #getBoundsTarget?: () => HTMLElement | null;
  #enabled = false;
  #point: PointerPoint | null = null;
  #press: PressTimeline | null = null;
  #cachedParams: RevealParams | null = null;
  #hostListening = false;

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    onInvalidate: () => void,
    isVisible?: () => boolean,
    getBoundsTarget?: () => HTMLElement | null,
  ) {
    this.host = host;
    this.#onInvalidate = onInvalidate;
    this.#isVisible = isVisible;
    this.#getBoundsTarget = getBoundsTarget;
    host.addController(this);
  }

  #boundsEl(): HTMLElement {
    return this.#getBoundsTarget?.() ?? this.host;
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  set enabled(value: boolean) {
    if (this.#enabled === value) return;
    this.#enabled = value;
    this.#syncTracker();
    if (!value && (this.#point || this.#press)) {
      this.#point = null;
      this.#press = null;
      this.#onInvalidate();
    }
  }

  get point(): PointerPoint | null {
    return this.#point;
  }

  /** Current press animation timeline (exposed for diagnostics and tests). */
  get press(): PressTimeline | null {
    return this.#press;
  }

  /** Clears cached reveal token values (called when theme or host style changes). */
  invalidateCache(): void {
    this.#cachedParams = null;
  }

  /** Programmatically sets local pointer coordinates (or `null` to clear) and invalidates. */
  setPointerPosition(point: { x: number; y: number } | null): void {
    if (!point) {
      if (this.#point !== null) {
        this.#point = null;
        this.#onInvalidate();
      }
      return;
    }
    const rect = this.#boundsEl().getBoundingClientRect();
    const inside = point.x >= 0 && point.y >= 0 && point.x <= rect.width && point.y <= rect.height;
    this.#point = { x: point.x, y: point.y, inside };
    this.#onInvalidate();
  }

  /** Triggers a Fluent press ripple at `(x, y)` relative to the surface's top-left corner. */
  triggerPress(x: number, y: number): void {
    if (!this.#enabled || prefersReducedMotion() || isForcedColors()) return;
    this.#press = {
      startFrame: null,
      currentFrame: null,
      releasedFrame: null,
      logicFrame: null,
      pressed: true,
      released: false,
      hasUp: false,
      downX: x,
      downY: y,
      upX: x,
      upY: y,
    };
    this.#onInvalidate();
  }

  /** Releases an active press, accelerating the remaining ripple or clearing on touch/cancel. */
  releasePress(x?: number, y?: number, pointerType = 'mouse'): void {
    if (!this.#press || !this.#press.pressed || this.#press.released) return;
    if (pointerType === 'mouse' || pointerType === 'keyboard' || pointerType === 'api') {
      this.#press.released = true;
      this.#press.releasedFrame = this.#press.currentFrame ?? 0;
      if (x !== undefined && y !== undefined) {
        this.#press.upX = x;
        this.#press.upY = y;
        this.#press.hasUp = true;
      }
    } else {
      this.#press = null;
    }
    this.#onInvalidate();
  }

  /** Remaining milliseconds until the current press ripple completes (assuming release now). */
  pressRemaining(now = performance.now()): number {
    if (!this.#press || !this.#press.pressed) return 0;
    const { pressSpeed, releaseAccelerateRate } = this.#getParams();
    if (!(pressSpeed > 0)) return 0;
    const start = this.#press.startFrame ?? now;
    const elapsed = now - start;
    const releasedAt = this.#press.released ? this.#press.releasedFrame : null;
    const progress =
      releasedAt !== null
        ? (elapsed + (elapsed - releasedAt) * releaseAccelerateRate) / pressSpeed
        : elapsed / pressSpeed;
    return Math.max(0, ((1 - progress) * pressSpeed) / (1 + releaseAccelerateRate));
  }

  /** Creates a `SurfaceLayer` bound to this controller's pointer coordinates. */
  createLayer(): SurfaceLayer {
    return {
      id: 'reveal',
      draw: (ctx, state) => this.draw(ctx, state),
    };
  }

  draw(ctx: CanvasRenderingContext2D, state: SurfaceRenderState): void {
    if (!this.#enabled || (!this.#point && !this.#press)) return;
    if (isForcedColors()) {
      this.#press = null;
      return;
    }
    const params = this.#getParams();
    const maxDim = Math.max(state.width, state.height);
    const lightRadius = Math.max(36, params.size ?? maxDim * DEFAULT_RELATIVE_RADIUS_FACTOR);

    ctx.save();

    if (this.#point) {
      const { x, y, inside } = this.#point;

      // 1. Ambient hover light when pointer is inside the element
      if (inside) {
        const fillGrad = ctx.createRadialGradient(x, y, 0, x, y, lightRadius);
        fillGrad.addColorStop(0, params.color);
        fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = fillGrad;
        ctx.fill(state.fillPath);
      }

      // 2. Proximity border highlight (illuminates edges as pointer approaches)
      const strokeWidth = Math.max(1.25, state.strokeWidth);
      const borderGrad = ctx.createRadialGradient(x, y, 0, x, y, lightRadius);
      borderGrad.addColorStop(0, params.borderColor);
      borderGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = borderGrad;
      ctx.lineJoin = 'round';
      ctx.stroke(state.strokePath);
    }

    // 3. Fluent Press Ripple (verbatim Axiom 2000ms linear + 7× release acceleration)
    if (this.#press && this.#press.pressed) {
      const finished = advancePressAnimation(
        this.#press,
        performance.now(),
        params.pressSpeed,
        params.releaseAccelerateRate,
      );
      if (finished) {
        this.#press = null;
      } else {
        const frame = this.#press.logicFrame ?? 0;
        const grdRadius = Math.max(1, maxDim);
        // Follows live pointer while held; pins to release point once released.
        const cx =
          this.#press.released && this.#press.hasUp
            ? this.#press.upX
            : this.#point
              ? this.#point.x
              : this.#press.downX;
        const cy =
          this.#press.released && this.#press.hasUp
            ? this.#press.upY
            : this.#point
              ? this.#point.y
              : this.#press.downY;

        const animateGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, grdRadius);
        applyPressGradientStops(animateGrd, params.pressRgb, params.pressOpacity, frame);
        ctx.fillStyle = animateGrd;
        ctx.fill(state.fillPath);

        // Schedule next rAF paint directly (full 60/120fps, zero skipped frames).
        this.#onInvalidate();
      }
    }

    ctx.restore();
  }

  hostConnected(): void {
    this.#cachedParams = null;
    this.#syncTracker();
  }

  hostDisconnected(): void {
    unregisterReveal(this);
    this.#removeHostListeners();
    this.#point = null;
    this.#press = null;
  }

  /** @internal */
  _updateFromClientPoint(clientX: number, clientY: number): void {
    if (this.#isVisible && !this.#isVisible()) return;
    const rect = this.#boundsEl().getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const { size } = this.#getParams();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Matches Axiom `surfaceLayer.ts`: reach is `Math.max(width, height)` in relative mode
    // (floored at 48px so small controls like checkboxes and switches receive proximity border glow).
    const range = size ?? Math.max(48, rect.width, rect.height);
    const inRange =
      x >= -range && y >= -range && x <= rect.width + range && y <= rect.height + range;
    if (!inRange) {
      if (this.#point !== null) {
        this.#point = null;
        this.#onInvalidate();
      }
      return;
    }

    const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    if (
      this.#point &&
      this.#point.x === x &&
      this.#point.y === y &&
      this.#point.inside === inside
    ) {
      return;
    }
    this.#point = { x, y, inside };
    this.#onInvalidate();
  }

  /** @internal */
  _clearFromTracker(): void {
    if (this.#point !== null) {
      this.#point = null;
      this.#onInvalidate();
    }
  }

  #onHostPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const rect = this.#boundsEl().getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (event.pointerType !== 'keyboard') {
      this.#point = {
        x,
        y,
        inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height,
      };
    }
    this.triggerPress(x, y);
  };

  #onHostPointerUp = (event: PointerEvent): void => {
    if (!this.#press || !this.#press.pressed || this.#press.released) return;
    const rect = this.#boundsEl().getBoundingClientRect();
    this.releasePress(event.clientX - rect.left, event.clientY - rect.top, event.pointerType);
  };

  #onHostPointerCancel = (): void => {
    if (this.#press) {
      this.#press = null;
      this.#onInvalidate();
    }
  };

  #getParams(): RevealParams {
    if (!this.#cachedParams) {
      this.#cachedParams = resolveRevealParams(this.host);
    }
    return this.#cachedParams;
  }

  #syncTracker(): void {
    if (this.#enabled && this.host.isConnected) {
      registerReveal(this);
      if (!this.#hostListening && !isServer) {
        this.#hostListening = true;
        this.host.addEventListener('pointerdown', this.#onHostPointerDown, { passive: true });
        window.addEventListener('pointerup', this.#onHostPointerUp, { passive: true });
        window.addEventListener('pointercancel', this.#onHostPointerCancel, { passive: true });
      }
    } else {
      unregisterReveal(this);
      this.#removeHostListeners();
    }
  }

  #removeHostListeners(): void {
    if (!this.#hostListening) return;
    this.#hostListening = false;
    this.host.removeEventListener('pointerdown', this.#onHostPointerDown);
    window.removeEventListener('pointerup', this.#onHostPointerUp);
    window.removeEventListener('pointercancel', this.#onHostPointerCancel);
  }
}
