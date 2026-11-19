import { isServer, type ReactiveController, type ReactiveControllerHost } from '@kerno/core';
import { prefersReducedMotion } from '../motion/index.js';
import { computePhysicalTilt } from '../pressure/index.js';
import { RevealController } from '../reveal/index.js';
import { cancelFrame, scheduleFrame } from '../surface/scheduler.js';
import {
  createPath2D,
  isCornerKind,
  isRoundedOnly,
  readElementShapeCss,
  toClipPath,
  toSvgPath,
  type CornerKind,
  type ShapeSpec,
} from './index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface ShapeOutlineConfig {
  /** Returns the target element to clip and prepend the SVG stroke overlay into. */
  getTarget(): HTMLElement | null;
  /** Returns the active corner family. */
  getKind(): CornerKind | string;
  /** Default radius in pixels when computed `borderTopLeftRadius` is 0 or unset. Defaults to `6`. */
  fallbackRadius?: number;
  /** Stroke inset in pixels. Defaults to `1` (matching Windows 10 2px control borders). */
  strokeInset?: number;
  /** Opt-in Reveal Highlight (defaults to `host.hasAttribute('reveal')`). */
  reveal?: boolean | (() => boolean);
  /** Opt-in physical 3D tilt (defaults to `host.hasAttribute('pressure')`). */
  pressure?: boolean | (() => boolean);
  /** Physical sink depth in pixels when `pressure` is enabled. Defaults to `1.15`. */
  pressureDepth?: number;
}

/**
 * Reusable `ReactiveController` that keeps standard rectangular/rounded
 * controls on pure CSS (zero observers, zero SVG/canvas nodes) and lazily
 * mounts `clip-path` + a crisp SVG contour border whenever `chamfer`,
 * `scallop`, `notch`, or parametric `--k-edge-*` / `--k-corner-*` features
 * are active.
 *
 * Reveal Highlight and 3D Pressure Tilt are strictly opt-in (via `reveal` /
 * `pressure` attributes on the host), preserving authentic Windows 10
 * Fluent 1 button/control behavior by default.
 */
export class ShapeOutlineController implements ReactiveController {
  readonly host: ReactiveControllerHost & HTMLElement;
  readonly #config: ShapeOutlineConfig;
  #reveal: RevealController | null = null;
  #observer: ResizeObserver | null = null;
  #observedTarget: HTMLElement | null = null;
  #svg: SVGSVGElement | null = null;
  #path: SVGPathElement | null = null;
  #canvas: HTMLCanvasElement | null = null;
  #canvasDirty = false;
  #dpr = 1;
  #pressureListening = false;
  #pressureTarget: HTMLElement | null = null;
  #pressed = false;

  constructor(host: ReactiveControllerHost & HTMLElement, config: ShapeOutlineConfig) {
    this.host = host;
    this.#config = config;
    host.addController(this);
  }

  hostConnected(): void {
    this.sync();
  }

  hostUpdated(): void {
    this.sync();
  }

  hostDisconnected(): void {
    cancelFrame(this.#paintRevealFrame);
    this.#disconnectObserver();
    this.#removePressureListeners();
    this.#resetPressure();
  }

  /** Synchronizes geometry clipping, stroke overlay, and optional opt-in Reveal/Pressure. */
  sync(): void {
    if (isServer) return;
    const target = this.#config.getTarget();
    if (!target) return;

    const rawKind = this.#config.getKind();
    const kind: CornerKind = isCornerKind(rawKind) ? rawKind : 'rounded';
    const disabled =
      this.host.hasAttribute('disabled') ||
      this.host.getAttribute('aria-disabled') === 'true' ||
      (this.host as unknown as { isDisabled?: boolean }).isDisabled === true;

    const revealCfg =
      typeof this.#config.reveal === 'function'
        ? this.#config.reveal()
        : (this.#config.reveal ?? this.host.hasAttribute('reveal'));
    const revealEnabled = Boolean(revealCfg) && !disabled && !this.host.hasAttribute('no-reveal');

    if (revealEnabled && !this.#reveal) {
      this.#reveal = new RevealController(
        this.host,
        () => this.#scheduleRevealPaint(),
        () => this.host.isConnected,
        () => this.#config.getTarget(),
      );
    }
    if (this.#reveal) {
      this.#reveal.enabled = revealEnabled;
    }

    const pressureCfg =
      typeof this.#config.pressure === 'function'
        ? this.#config.pressure()
        : (this.#config.pressure ?? this.host.hasAttribute('pressure'));
    const pressureEnabled =
      Boolean(pressureCfg) && !disabled && !this.host.hasAttribute('no-pressure');
    this.#syncPressureListeners(target, pressureEnabled);

    if (revealEnabled) {
      if (!this.#canvas || this.#canvas.parentElement !== target) {
        const canvas = document.createElement('canvas');
        canvas.setAttribute('class', 'shape-reveal');
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText =
          'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;border-radius:inherit;z-index:1;';
        target.prepend(canvas);
        this.#canvas = canvas;
        this.#canvasDirty = false;
      }
    } else if (this.#canvas) {
      this.#canvas.remove();
      this.#canvas = null;
      this.#canvasDirty = false;
    }

    const spec = this.#resolveSpec(target, kind);
    const needsCustomOutline = !isRoundedOnly(spec);

    if (!needsCustomOutline) {
      if (target.style.clipPath) target.style.clipPath = '';
      this.#svg?.remove();
      this.#svg = null;
      this.#path = null;
    } else {
      if (!this.#svg || this.#svg.parentElement !== target) {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('class', 'shape-stroke');
        svg.setAttribute('aria-hidden', 'true');
        const path = document.createElementNS(SVG_NS, 'path');
        svg.append(path);
        target.prepend(svg);
        this.#svg = svg;
        this.#path = path;
      }
      this.#paintOutline(target, spec);
    }

    if (
      (needsCustomOutline || revealEnabled) &&
      this.host.isConnected &&
      typeof ResizeObserver === 'function'
    ) {
      if (!this.#observer || this.#observedTarget !== target) {
        this.#disconnectObserver();
        this.#observer = new ResizeObserver(() => {
          const nextKind: CornerKind = isCornerKind(this.#config.getKind())
            ? (this.#config.getKind() as CornerKind)
            : 'rounded';
          const nextSpec = this.#resolveSpec(target, nextKind);
          if (this.#svg) this.#paintOutline(target, nextSpec);
          if (this.#reveal?.enabled) this.#scheduleRevealPaint();
        });
        this.#observer.observe(target);
        this.#observedTarget = target;
      }
    } else if (!needsCustomOutline && !revealEnabled) {
      this.#disconnectObserver();
    }

    if (revealEnabled) {
      this.#scheduleRevealPaint();
    }
  }

  #resolveSpec(target: HTMLElement, kind: CornerKind): ShapeSpec {
    const rect = target.getBoundingClientRect();
    const w = Math.max(0, rect.width);
    const h = Math.max(0, rect.height);
    const fallback = this.#config.fallbackRadius ?? 6;
    const rawRadius = Number.parseFloat(getComputedStyle(target).borderTopLeftRadius);
    const radius = Number.isFinite(rawRadius) && rawRadius > 0 ? rawRadius : fallback;
    return readElementShapeCss(this.host, w, h, { kind, radius });
  }

  #paintOutline(target: HTMLElement, spec: ShapeSpec): void {
    const rect = target.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;

    const inset = this.#config.strokeInset ?? 1;
    target.style.clipPath = toClipPath(w, h, spec);
    this.#svg?.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.#path?.setAttribute('d', toSvgPath(w, h, spec, inset));
  }

  #scheduleRevealPaint(): void {
    if (isServer || !this.host.isConnected) return;
    scheduleFrame(this.#paintRevealFrame);
  }

  #paintRevealFrame = (): void => {
    const canvas = this.#canvas;
    const target = this.#config.getTarget();
    const reveal = this.#reveal;
    if (!canvas || !target || !reveal || !reveal.enabled) return;

    const hasActiveLight = reveal.point !== null || reveal.press !== null;
    if (!hasActiveLight) {
      if (this.#canvasDirty) {
        const ctx = canvas.getContext('2d');
        ctx?.setTransform(1, 0, 0, 1, 0, 0);
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        this.#canvasDirty = false;
      }
      return;
    }

    const rect = target.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const pw = Math.max(1, Math.round(w * dpr));
    const ph = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== pw || canvas.height !== ph || this.#dpr !== dpr) {
      canvas.width = pw;
      canvas.height = ph;
      this.#dpr = dpr;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rawKind = this.#config.getKind();
    const kind: CornerKind = isCornerKind(rawKind) ? rawKind : 'rounded';
    const spec = this.#resolveSpec(target, kind);
    const strokeWidth = 2;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    reveal.draw(ctx, {
      host: this.host,
      width: w,
      height: h,
      dpr,
      shape: spec,
      strokeWidth,
      fillPath: createPath2D(w, h, spec, 0),
      strokePath: createPath2D(w, h, spec, strokeWidth / 2),
      fillColor: 'transparent',
      strokeColor: 'transparent',
      acrylic: false,
    });
    ctx.restore();
    this.#canvasDirty = true;
  };

  #syncPressureListeners(target: HTMLElement, enabled: boolean): void {
    if (isServer) return;
    if (enabled && this.host.isConnected) {
      if (!this.#pressureListening || this.#pressureTarget !== target) {
        this.#removePressureListeners();
        this.#pressureListening = true;
        this.#pressureTarget = target;
        target.addEventListener('pointerdown', this.#onPointerDown, { passive: true });
        window.addEventListener('pointerup', this.#onPointerUp, { passive: true });
        window.addEventListener('pointercancel', this.#onPointerUp, { passive: true });
      }
    } else if (this.#pressureListening) {
      this.#removePressureListeners();
      this.#resetPressure();
    }
  }

  #removePressureListeners(): void {
    if (!this.#pressureListening) return;
    this.#pressureListening = false;
    this.#pressureTarget?.removeEventListener('pointerdown', this.#onPointerDown);
    this.#pressureTarget = null;
    window.removeEventListener('pointerup', this.#onPointerUp);
    window.removeEventListener('pointercancel', this.#onPointerUp);
  }

  #onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || prefersReducedMotion()) return;
    const target = this.#pressureTarget;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const { cssTransform } = computePhysicalTilt(
      event.clientX - rect.left,
      event.clientY - rect.top,
      rect.width,
      rect.height,
      {
        depth: this.#config.pressureDepth ?? 1.15,
        zoom: 0.55,
        perspective: 480,
      },
    );
    this.#pressed = true;
    target.style.transform = cssTransform;
  };

  #onPointerUp = (): void => {
    this.#resetPressure();
  };

  #resetPressure(): void {
    if (!this.#pressed && !this.#pressureTarget?.style.transform) return;
    this.#pressed = false;
    if (this.#pressureTarget) {
      this.#pressureTarget.style.transform = '';
    }
  }

  #disconnectObserver(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#observedTarget = null;
  }
}
