import { isServer, type ReactiveController, type ReactiveControllerHost } from '@kerno/core';
import type { AcrylicMaterialParams } from '../acrylic/index.js';
import {
  elevationToken,
  normalizeElevation,
  resolveDropShadowFilter,
  type ElevationInput,
} from '../elevation/index.js';
import {
  createPath2D,
  isRoundedOnly,
  normalizeShape,
  toClipPath,
  type ShapeInput,
  type ShapeSpec,
} from '../shape/index.js';
import { defaultSurfaceLayers, type SurfaceLayer, type SurfaceRenderState } from './layers.js';
import { cancelFrame, scheduleFrame } from './scheduler.js';

export interface SurfaceControllerConfig {
  readonly canvas: HTMLCanvasElement;
  readonly clipTarget?: HTMLElement;
  getShape(): ShapeInput | ShapeSpec;
  getElevation(): ElevationInput;
  getAcrylic(): boolean;
  getAcrylicOverrides?(): Partial<AcrylicMaterialParams> | undefined;
  getFillColor(): string;
  getStrokeColor(): string;
  getStrokeWidth(): number;
  getLayers?(): readonly SurfaceLayer[];
}

/**
 * Coordinates geometry clipping, HiDPI canvas sizing, visibility throttling,
 * and frame-batched layer rendering for a host element.
 */
export class SurfaceController implements ReactiveController {
  readonly host: ReactiveControllerHost & HTMLElement;
  #config: SurfaceControllerConfig | null = null;
  #resizeObserver: ResizeObserver | null = null;
  #intersectionObserver: IntersectionObserver | null = null;
  #width = 0;
  #height = 0;
  #visible = true;
  #dirty = false;
  #paintCount = 0;

  constructor(host: ReactiveControllerHost & HTMLElement) {
    this.host = host;
    host.addController(this);
  }

  /** Number of completed canvas paint passes (exposed for diagnostics and tests). */
  get paintCount(): number {
    return this.#paintCount;
  }

  get width(): number {
    return this.#width;
  }

  get height(): number {
    return this.#height;
  }

  get isVisible(): boolean {
    return this.#visible;
  }

  bind(config: SurfaceControllerConfig): void {
    this.#config = config;
    this.#measureFallback();
    this.invalidate();
  }

  hostConnected(): void {
    if (isServer) return;
    if (typeof ResizeObserver === 'function' && !this.#resizeObserver) {
      this.#resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const box = entry.borderBoxSize?.[0];
        const w = box ? box.inlineSize : entry.contentRect.width;
        const h = box ? box.blockSize : entry.contentRect.height;
        if (w !== this.#width || h !== this.#height) {
          this.#width = w;
          this.#height = h;
          this.invalidate();
        }
      });
      this.#resizeObserver.observe(this.host);
    }

    if (typeof IntersectionObserver === 'function' && !this.#intersectionObserver) {
      this.#intersectionObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        this.setVisible(entry.isIntersecting);
      });
      this.#intersectionObserver.observe(this.host);
    }

    this.#measureFallback();
    this.invalidate();
  }

  hostUpdated(): void {
    this.invalidate();
  }

  hostDisconnected(): void {
    cancelFrame(this.#paintTask);
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#intersectionObserver?.disconnect();
    this.#intersectionObserver = null;
    const layers = this.#config?.getLayers?.() ?? defaultSurfaceLayers;
    for (const layer of layers) layer.destroy?.();
  }

  /** Updates visibility state; when resuming visibility with pending changes, schedules a frame. */
  setVisible(visible: boolean): void {
    if (this.#visible === visible) return;
    this.#visible = visible;
    if (!visible) {
      cancelFrame(this.#paintTask);
    } else if (this.#dirty) {
      scheduleFrame(this.#paintTask);
    }
  }

  /** Requests a coalesced redraw on the next animation frame. */
  invalidate(): void {
    this.#dirty = true;
    if (!this.#visible) return;
    scheduleFrame(this.#paintTask);
  }

  /** Immediately executes a paint pass if dirty or forced. */
  paintNow(): void {
    cancelFrame(this.#paintTask);
    this.#paintTask();
  }

  #measureFallback(): void {
    if (isServer) return;
    if (this.#width === 0 && this.#height === 0) {
      const rect = this.host.getBoundingClientRect();
      this.#width = rect.width;
      this.#height = rect.height;
    }
  }

  #paintTask = (): void => {
    if (!this.#config || !this.#visible) return;
    this.#measureFallback();
    const w = this.#width;
    const h = this.#height;
    if (w <= 0 || h <= 0) return;

    this.#dirty = false;
    const cfg = this.#config;
    const shape = normalizeShape(cfg.getShape());
    const roundedOnly = isRoundedOnly(shape);
    const clipEl = cfg.clipTarget ?? this.host;

    // 1. Geometry clip & border-radius sync
    if (roundedOnly) {
      clipEl.style.clipPath = '';
      clipEl.style.borderRadius = `${shape.topLeft.radius}px ${shape.topRight.radius}px ${shape.bottomRight.radius}px ${shape.bottomLeft.radius}px`;
    } else {
      clipEl.style.borderRadius = '0px';
      clipEl.style.clipPath = toClipPath(w, h, shape);
    }

    // 2. Elevation sync (box-shadow for rounded, drop-shadow filter for custom shapes)
    const elevation = normalizeElevation(cfg.getElevation());
    if (elevation === 0) {
      clipEl.style.boxShadow = 'none';
      this.host.style.filter = '';
    } else if (roundedOnly) {
      clipEl.style.boxShadow = elevationToken(elevation);
      this.host.style.filter = '';
    } else {
      clipEl.style.boxShadow = 'none';
      this.host.style.filter = resolveDropShadowFilter(this.host, elevation);
    }

    // 3. HiDPI Canvas draw
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const canvas = cfg.canvas;
    const targetW = Math.max(1, Math.round(w * dpr));
    const targetH = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== targetW) canvas.width = targetW;
    if (canvas.height !== targetH) canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const strokeWidth = Math.max(0, cfg.getStrokeWidth());
    const fillPath = createPath2D(w, h, shape, 0);
    const strokePath = strokeWidth > 0 ? createPath2D(w, h, shape, strokeWidth / 2) : fillPath;

    const state: SurfaceRenderState = {
      host: this.host,
      width: w,
      height: h,
      dpr,
      shape,
      fillPath,
      strokePath,
      strokeWidth,
      fillColor: cfg.getFillColor(),
      strokeColor: cfg.getStrokeColor(),
      acrylic: cfg.getAcrylic(),
      acrylicOverrides: cfg.getAcrylicOverrides?.(),
    };

    const layers = cfg.getLayers?.() ?? defaultSurfaceLayers;
    for (const layer of layers) {
      layer.draw(ctx, state);
    }
    this.#paintCount++;
  };
}
