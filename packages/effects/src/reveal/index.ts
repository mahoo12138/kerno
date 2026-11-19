import { isServer, type ReactiveController, type ReactiveControllerHost } from '@kerno/core';
import { tokenName } from '@kerno/tokens';
import type { SurfaceLayer, SurfaceRenderState } from '../surface/layers.js';
import { cancelFrame, scheduleFrame } from '../surface/scheduler.js';

export interface RevealParams {
  color: string;
  borderColor: string;
  size: number;
}

const DEFAULT_REVEAL: RevealParams = {
  color: 'rgba(0, 0, 0, 0.08)',
  borderColor: 'rgba(0, 0, 0, 0.25)',
  size: 120,
};

export function resolveRevealParams(el: Element): RevealParams {
  if (isServer || typeof getComputedStyle === 'undefined') return DEFAULT_REVEAL;
  const style = getComputedStyle(el);
  const color =
    style.getPropertyValue(tokenName('surface.reveal.color')).trim() || DEFAULT_REVEAL.color;
  const borderColor =
    style.getPropertyValue(tokenName('surface.reveal.borderColor')).trim() ||
    DEFAULT_REVEAL.borderColor;
  const rawSize = Number.parseFloat(
    style.getPropertyValue(tokenName('surface.reveal.size')).trim(),
  );
  const size = Number.isFinite(rawSize) && rawSize > 0 ? rawSize : DEFAULT_REVEAL.size;
  return { color, borderColor, size };
}

export interface PointerPoint {
  /** X coordinate relative to the surface's top-left corner. */
  x: number;
  /** Y coordinate relative to the surface's top-left corner. */
  y: number;
  /** Whether the pointer is strictly inside the surface bounding box. */
  inside: boolean;
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
 * pointer tracker and frame-coalesced geometry checks, caching token params
 * between theme changes so the pointer hot path never reads `getComputedStyle`.
 */
export class RevealController implements ReactiveController {
  readonly host: ReactiveControllerHost & HTMLElement;
  readonly #onInvalidate: () => void;
  readonly #isVisible?: () => boolean;
  #enabled = false;
  #point: PointerPoint | null = null;
  #cachedParams: RevealParams | null = null;

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
    if (!value && this.#point) {
      this.#point = null;
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

  /** Creates a `SurfaceLayer` bound to this controller's pointer coordinates. */
  createLayer(): SurfaceLayer {
    return {
      id: 'reveal',
      draw: (ctx, state) => this.draw(ctx, state),
    };
  }

  draw(ctx: CanvasRenderingContext2D, state: SurfaceRenderState): void {
    if (!this.#enabled || !this.#point) return;
    const { x, y, inside } = this.#point;
    const params = this.#getParams();
    const radius = params.size;

    ctx.save();

    // 1. Ambient surface glow when pointer is inside the element
    if (inside) {
      const fillGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      fillGrad.addColorStop(0, params.color);
      fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fillGrad;
      ctx.fill(state.fillPath);
    }

    // 2. Proximity border highlight (illuminates edges as pointer approaches)
    const strokeWidth = Math.max(1, state.strokeWidth);
    const borderGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    borderGrad.addColorStop(0, params.borderColor);
    borderGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = borderGrad;
    ctx.lineJoin = 'round';
    ctx.stroke(state.strokePath);

    ctx.restore();
  }

  hostConnected(): void {
    this.#cachedParams = null;
    this.#syncTracker();
  }

  hostDisconnected(): void {
    unregisterReveal(this);
    this.#point = null;
  }

  /** @internal */
  _updateFromClientPoint(clientX: number, clientY: number): void {
    if (this.#isVisible && !this.#isVisible()) return;
    const rect = this.host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const { size } = this.#getParams();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const inRange = x >= -size && y >= -size && x <= rect.width + size && y <= rect.height + size;
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

  #getParams(): RevealParams {
    if (!this.#cachedParams) {
      this.#cachedParams = resolveRevealParams(this.host);
    }
    return this.#cachedParams;
  }

  #syncTracker(): void {
    if (this.#enabled && this.host.isConnected) {
      registerReveal(this);
    } else {
      unregisterReveal(this);
    }
  }
}
