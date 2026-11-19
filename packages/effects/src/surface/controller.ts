import { isServer, type ReactiveController, type ReactiveControllerHost } from '@kerno/core';
import { shouldCutBackdropWithClipPath, type AcrylicMaterialParams } from '../acrylic/index.js';
import {
  elevationToken,
  normalizeElevation,
  resolveShadowLayers,
  type ElevationInput,
} from '../elevation/index.js';
import {
  borderInner,
  createPath2D,
  isRoundedOnly,
  readElementShapeCss,
  resolveShape,
  toClipPath,
  toMaskImage,
  toParametricSpec,
  traceContour,
  traceInner,
  type Quad,
  type ShapeInput,
  type ShapeSpec,
} from '../shape/index.js';
import { observeSurfaceEnvironment } from './env-observer.js';
import { defaultSurfaceLayers, type SurfaceLayer, type SurfaceRenderState } from './layers.js';
import { cancelFrame, scheduleFrame } from './scheduler.js';

export interface SurfaceControllerConfig {
  readonly canvas: HTMLCanvasElement;
  readonly shadowCanvas?: HTMLCanvasElement;
  readonly backdropTarget?: HTMLElement;
  readonly clipTarget?: HTMLElement;
  getShape(): ShapeInput | ShapeSpec;
  getElevation(): ElevationInput;
  getAcrylic(): boolean;
  getAcrylicOverrides?(): Partial<AcrylicMaterialParams> | undefined;
  getFillColor(): string;
  getStrokeColor(): string;
  getStrokeWidth(): number;
  getBorderWidths?(): Quad<number>;
  getLayers?(): readonly SurfaceLayer[];
  onEnvironmentChange?(): void;
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
  #stopEnvObserver: (() => void) | null = null;
  #width = 0;
  #height = 0;
  #visible = true;
  #dirty = false;
  #paintCount = 0;
  #lastGeometryKey = '';

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
        const entry = entries[entries.length - 1];
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
      this.#intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (!entry) return;
          this.setVisible(entry.isIntersecting);
        },
        { rootMargin: '200px' },
      );
      this.#intersectionObserver.observe(this.host);
    }

    if (!this.#stopEnvObserver) {
      this.#stopEnvObserver = observeSurfaceEnvironment(this.host, () => {
        this.#config?.onEnvironmentChange?.();
        this.invalidate();
      });
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
    this.#stopEnvObserver?.();
    this.#stopEnvObserver = null;
    this.#lastGeometryKey = '';
    const layers = this.#config?.getLayers?.() ?? defaultSurfaceLayers;
    for (const layer of layers) layer.destroy?.();
  }

  /** Updates visibility state; when resuming visibility with pending changes, repaints immediately. */
  setVisible(visible: boolean): void {
    if (this.#visible === visible) return;
    this.#visible = visible;
    if (!visible) {
      cancelFrame(this.#paintTask);
    } else if (this.#dirty) {
      this.paintNow();
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
    const shape = readElementShapeCss(this.host, w, h, cfg.getShape());
    const roundedOnly = isRoundedOnly(shape);
    const acrylic = cfg.getAcrylic();
    const clipEl = cfg.clipTarget ?? this.host;
    const backdropEl = cfg.backdropTarget;

    // 1. Geometry clip, backdrop mask & border-radius sync (cached to avoid
    //    re-decoding SVG data URLs during 60fps Reveal hover repaints).
    const clipCss = roundedOnly ? '' : toClipPath(w, h, shape);
    const geometryKey = `${w}|${h}|${acrylic ? 1 : 0}|${roundedOnly ? `${shape.topLeft.radius},${shape.topRight.radius},${shape.bottomRight.radius},${shape.bottomLeft.radius}` : clipCss}`;
    if (geometryKey !== this.#lastGeometryKey) {
      this.#lastGeometryKey = geometryKey;
      if (roundedOnly) {
        const radiusCss = `${shape.topLeft.radius}px ${shape.topRight.radius}px ${shape.bottomRight.radius}px ${shape.bottomLeft.radius}px`;
        clipEl.style.clipPath = '';
        clipEl.style.borderRadius = radiusCss;
        cfg.canvas.style.borderRadius = radiusCss;
        if (backdropEl) {
          backdropEl.style.borderRadius = radiusCss;
          backdropEl.style.clipPath = '';
          backdropEl.style.maskImage = '';
          backdropEl.style.webkitMaskImage = '';
        }
      } else {
        clipEl.style.borderRadius = '0px';
        clipEl.style.clipPath = clipCss;
        cfg.canvas.style.borderRadius = '0px';
        if (backdropEl) {
          backdropEl.style.borderRadius = '0px';
          if (acrylic) {
            if (shouldCutBackdropWithClipPath()) {
              backdropEl.style.maskImage = '';
              backdropEl.style.webkitMaskImage = '';
              backdropEl.style.clipPath = clipCss;
            } else {
              const mask = toMaskImage(w, h, shape);
              backdropEl.style.clipPath = '';
              backdropEl.style.maskImage = mask;
              backdropEl.style.webkitMaskImage = mask;
            }
          } else {
            backdropEl.style.clipPath = '';
            backdropEl.style.maskImage = '';
            backdropEl.style.webkitMaskImage = '';
          }
        }
      }
    }

    // 2. Elevation sync
    // Rounded shapes use compositor-friendly box-shadow on the full-host canvas
    // element; non-rectangular shapes paint an outer knockout shadow onto the
    // sibling shadowCanvas so `:host` NEVER receives CSS `filter` (which would
    // break `backdrop-filter` on Acrylic).
    const elevation = normalizeElevation(cfg.getElevation());
    const nextShadow = elevation === 0 || !roundedOnly ? 'none' : elevationToken(elevation);
    if (cfg.canvas.style.boxShadow !== nextShadow) cfg.canvas.style.boxShadow = nextShadow;

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

    const rawWidths = cfg.getBorderWidths?.();
    const baseStroke = Math.max(0, cfg.getStrokeWidth());
    const borderWidths: Quad<number> = rawWidths
      ? [
          Math.max(0, rawWidths[0]),
          Math.max(0, rawWidths[1]),
          Math.max(0, rawWidths[2]),
          Math.max(0, rawWidths[3]),
        ]
      : [baseStroke, baseStroke, baseStroke, baseStroke];
    const strokeWidth = Math.max(...borderWidths);
    const fillPath = createPath2D(w, h, shape, 0);
    const strokePath = strokeWidth > 0 ? createPath2D(w, h, shape, strokeWidth / 2) : fillPath;

    let borderRingPath: Path2D | undefined;
    if (strokeWidth > 0 && typeof Path2D !== 'undefined') {
      const resolved = resolveShape(toParametricSpec(w, h, shape, 0), { borderWidths });
      const { inner } = borderInner(resolved.outline, { widths: borderWidths });
      const ring = new Path2D();
      traceContour(ring, resolved.outline);
      traceInner(ring, inner);
      borderRingPath = ring;
    }

    if (cfg.shadowCanvas) {
      this.#paintShadowCanvas(cfg.shadowCanvas, w, h, dpr, fillPath, roundedOnly ? 0 : elevation);
    }

    const state: SurfaceRenderState = {
      host: this.host,
      width: w,
      height: h,
      dpr,
      shape,
      fillPath,
      strokePath,
      strokeWidth,
      borderWidths,
      ...(borderRingPath ? { borderRingPath } : {}),
      fillColor: cfg.getFillColor(),
      strokeColor: cfg.getStrokeColor(),
      acrylic,
      acrylicOverrides: cfg.getAcrylicOverrides?.(),
    };

    const layers = cfg.getLayers?.() ?? defaultSurfaceLayers;
    for (const layer of layers) {
      layer.draw(ctx, state);
    }
    this.#paintCount++;
  };

  #paintShadowCanvas(
    shadowCanvas: HTMLCanvasElement,
    w: number,
    h: number,
    dpr: number,
    fillPath: Path2D,
    elevation: number,
  ): void {
    const layers = elevation > 0 ? resolveShadowLayers(this.host, elevation) : [];
    if (layers.length === 0) {
      shadowCanvas.hidden = true;
      return;
    }
    shadowCanvas.hidden = false;
    const pad = 48;
    const totalW = w + pad * 2;
    const totalH = h + pad * 2;
    const pxW = Math.max(1, Math.round(totalW * dpr));
    const pxH = Math.max(1, Math.round(totalH * dpr));
    if (shadowCanvas.width !== pxW) shadowCanvas.width = pxW;
    if (shadowCanvas.height !== pxH) shadowCanvas.height = pxH;

    const sctx = shadowCanvas.getContext('2d');
    if (!sctx) return;

    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, totalW, totalH);
    sctx.save();
    sctx.translate(pad, pad);

    // Draw outer shadow for each elevation layer using a far off-screen caster offset
    // or filling and then knocking out the shape interior with destination-out.
    for (const layer of layers) {
      sctx.save();
      sctx.shadowOffsetX = layer.offsetX;
      sctx.shadowOffsetY = layer.offsetY;
      sctx.shadowBlur = layer.blur;
      sctx.shadowColor = layer.color;
      sctx.fillStyle = '#000000';
      sctx.fill(fillPath);
      sctx.restore();
    }

    // Punch out the interior so Acrylic remains 100% translucent with zero dark backing.
    sctx.globalCompositeOperation = 'destination-out';
    sctx.fillStyle = '#000000';
    sctx.fill(fillPath);
    sctx.restore();
  }
}
