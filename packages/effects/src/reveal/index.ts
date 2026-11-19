import { isServer, type ReactiveController, type ReactiveControllerHost } from '@kerno/core';
import { tokenName } from '@kerno/tokens';
import { prefersReducedMotion } from '../motion/index.js';
import type { SurfaceLayer, SurfaceRenderState } from '../surface/layers.js';
import { cancelFrame, scheduleFrame } from '../surface/scheduler.js';

export interface RevealParams {
  color: string;
  borderColor: string;
  pressColor: string;
  size: number;
}

const DEFAULT_REVEAL: RevealParams = {
  color: 'rgba(0, 0, 0, 0.09)',
  borderColor: 'rgba(0, 0, 0, 0.34)',
  pressColor: 'rgba(0, 0, 0, 0.14)',
  size: 140,
};

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
  const rawSize = Number.parseFloat(
    style.getPropertyValue(tokenName('surface.reveal.size')).trim(),
  );
  const size = Number.isFinite(rawSize) && rawSize > 0 ? rawSize : DEFAULT_REVEAL.size;
  return { color, borderColor, pressColor, size };
}

export interface PointerPoint {
  /** X coordinate relative to the surface's top-left corner. */
  x: number;
  /** Y coordinate relative to the surface's top-left corner. */
  y: number;
  /** Whether the pointer is strictly inside the surface bounding box. */
  inside: boolean;
}

interface PressRipple {
  x: number;
  y: number;
  startTime: number;
  releasedAt: number | null;
}

const RIPPLE_DURATION_MS = 460;
const RIPPLE_RELEASE_MS = 180;

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
 * pointer tracker and frame-coalesced geometry checks, rendering hover glow,
 * proximity border illumination, and Fluent press ripples.
 */
export class RevealController implements ReactiveController {
  readonly host: ReactiveControllerHost & HTMLElement;
  readonly #onInvalidate: () => void;
  readonly #isVisible?: () => boolean;
  #enabled = false;
  #point: PointerPoint | null = null;
  #ripple: PressRipple | null = null;
  #cachedParams: RevealParams | null = null;
  #hostListening = false;

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    onInvalidate: () => void,
    isVisible?: () => boolean,
  ) {
    this.host = host;
    this.#onInvalidate = onInvalidate;
    this.#isVisible = isVisible;
    host.addController(this);
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  set enabled(value: boolean) {
    if (this.#enabled === value) return;
    this.#enabled = value;
    this.#syncTracker();
    if (!value && (this.#point || this.#ripple)) {
      this.#point = null;
      this.#ripple = null;
      this.#onInvalidate();
    }
  }

  get point(): PointerPoint | null {
    return this.#point;
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
    const rect = this.host.getBoundingClientRect();
    const inside = point.x >= 0 && point.y >= 0 && point.x <= rect.width && point.y <= rect.height;
    this.#point = { x: point.x, y: point.y, inside };
    this.#onInvalidate();
  }

  /** Triggers a press ripple at `(x, y)` relative to the surface's top-left corner. */
  triggerPress(x: number, y: number): void {
    if (!this.#enabled || prefersReducedMotion()) return;
    this.#ripple = { x, y, startTime: performance.now(), releasedAt: null };
    this.#onInvalidate();
  }

  /** Creates a `SurfaceLayer` bound to this controller's pointer coordinates. */
  createLayer(): SurfaceLayer {
    return {
      id: 'reveal',
      draw: (ctx, state) => this.draw(ctx, state),
    };
  }

  draw(ctx: CanvasRenderingContext2D, state: SurfaceRenderState): void {
    if (!this.#enabled || (!this.#point && !this.#ripple)) return;
    const params = this.#getParams();
    const radius = params.size;

    ctx.save();

    if (this.#point) {
      const { x, y, inside } = this.#point;

      // 1. Ambient surface glow when pointer is inside the element
      if (inside) {
        const fillGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        fillGrad.addColorStop(0, params.color);
        fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = fillGrad;
        ctx.fill(state.fillPath);
      }

      // 2. Proximity border highlight (illuminates edges as pointer approaches)
      const strokeWidth = Math.max(1.25, state.strokeWidth);
      const borderGrad = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.15);
      borderGrad.addColorStop(0, params.borderColor);
      borderGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = borderGrad;
      ctx.lineJoin = 'round';
      ctx.stroke(state.strokePath);
    }

    // 3. Fluent Press Ripple (expanding radial highlight ring + fill)
    if (this.#ripple) {
      const now = performance.now();
      const elapsed = now - this.#ripple.startTime;
      const expandProgress = Math.min(1, elapsed / RIPPLE_DURATION_MS);
      const eased = 1 - Math.pow(1 - expandProgress, 3);
      const maxR = Math.hypot(state.width, state.height) * 0.9;
      const r = Math.max(8, maxR * eased);

      let alpha = 1 - expandProgress * 0.55;
      if (this.#ripple.releasedAt !== null) {
        const releaseProgress = Math.min(1, (now - this.#ripple.releasedAt) / RIPPLE_RELEASE_MS);
        alpha *= 1 - releaseProgress;
      }

      if (alpha <= 0.01) {
        this.#ripple = null;
      } else {
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        const rippleGrad = ctx.createRadialGradient(
          this.#ripple.x,
          this.#ripple.y,
          0,
          this.#ripple.x,
          this.#ripple.y,
          r,
        );
        rippleGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        rippleGrad.addColorStop(0.68, params.pressColor);
        rippleGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = rippleGrad;
        ctx.fill(state.fillPath);
        scheduleFrame(this.#tickRipple);
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
    cancelFrame(this.#tickRipple);
    this.#point = null;
    this.#ripple = null;
  }

  /** @internal */
  _updateFromClientPoint(clientX: number, clientY: number): void {
    if (this.#isVisible && !this.#isVisible()) return;
    const rect = this.host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const { size } = this.#getParams();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const range = size * 1.15;
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

  #tickRipple = (): void => {
    if (this.#ripple) this.#onInvalidate();
  };

  #onHostPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const rect = this.host.getBoundingClientRect();
    this.triggerPress(event.clientX - rect.left, event.clientY - rect.top);
  };

  #onHostPointerUp = (): void => {
    if (this.#ripple && this.#ripple.releasedAt === null) {
      this.#ripple.releasedAt = performance.now();
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
        window.addEventListener('pointercancel', this.#onHostPointerUp, { passive: true });
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
    window.removeEventListener('pointercancel', this.#onHostPointerUp);
  }
}
