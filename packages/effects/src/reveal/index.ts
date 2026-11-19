import { isServer, type ReactiveController, type ReactiveControllerHost } from '@kerno/core';
import { tokenName } from '@kerno/tokens';
import type { SurfaceLayer, SurfaceRenderState } from '../surface/layers.js';

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

/**
 * Tracks pointer position for a Reveal-enabled surface and triggers canvas
 * redraws only while the pointer is within illumination range.
 */
export class RevealController implements ReactiveController {
  readonly host: ReactiveControllerHost & HTMLElement;
  readonly #onInvalidate: () => void;
  #enabled = false;
  #point: PointerPoint | null = null;
  #listening = false;

  constructor(host: ReactiveControllerHost & HTMLElement, onInvalidate: () => void) {
    this.host = host;
    this.#onInvalidate = onInvalidate;
    host.addController(this);
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  set enabled(value: boolean) {
    if (this.#enabled === value) return;
    this.#enabled = value;
    this.#syncListeners();
    if (!value && this.#point) {
      this.#point = null;
      this.#onInvalidate();
    }
  }

  get point(): PointerPoint | null {
    return this.#point;
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
    const params = resolveRevealParams(this.host);
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
    this.#syncListeners();
  }

  hostDisconnected(): void {
    this.#removeListeners();
  }

  #syncListeners(): void {
    if (isServer) return;
    if (this.#enabled && this.host.isConnected && !this.#listening) {
      this.#listening = true;
      document.addEventListener('pointermove', this.#onPointerMove, { passive: true });
      document.addEventListener('pointerleave', this.#onPointerLeave, { passive: true });
    } else if ((!this.#enabled || !this.host.isConnected) && this.#listening) {
      this.#removeListeners();
    }
  }

  #removeListeners(): void {
    if (!this.#listening) return;
    this.#listening = false;
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerleave', this.#onPointerLeave);
  }

  #onPointerMove = (event: PointerEvent): void => {
    const rect = this.host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const { size } = resolveRevealParams(this.host);
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const inRange = x >= -size && y >= -size && x <= rect.width + size && y <= rect.height + size;
    if (!inRange) {
      if (this.#point !== null) {
        this.#point = null;
        this.#onInvalidate();
      }
      return;
    }

    const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    this.#point = { x, y, inside };
    this.#onInvalidate();
  };

  #onPointerLeave = (): void => {
    if (this.#point !== null) {
      this.#point = null;
      this.#onInvalidate();
    }
  };
}
