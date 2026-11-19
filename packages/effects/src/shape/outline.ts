import { isServer, type ReactiveController, type ReactiveControllerHost } from '@kerno/core';
import { isCornerKind, toClipPath, toSvgPath, type CornerKind } from './index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface ShapeOutlineConfig {
  /** Returns the target element to clip and prepend the SVG stroke overlay into. */
  getTarget(): HTMLElement | null;
  /** Returns the active corner family. */
  getKind(): CornerKind | string;
  /** Default radius in pixels when computed `borderTopLeftRadius` is 0 or unset. Defaults to `6`. */
  fallbackRadius?: number;
  /** Stroke inset in pixels. Defaults to `0.5`. */
  strokeInset?: number;
}

/**
 * Reusable `ReactiveController` that keeps `shape="rounded"` controls on pure
 * CSS (zero observers, zero SVG nodes) and lazily mounts `clip-path` + a crisp
 * SVG contour border whenever `chamfer`, `scallop`, or `notch` is active.
 *
 * Handles disconnect / reconnect lifecycles automatically.
 */
export class ShapeOutlineController implements ReactiveController {
  readonly host: ReactiveControllerHost & HTMLElement;
  readonly #config: ShapeOutlineConfig;
  #observer: ResizeObserver | null = null;
  #observedTarget: HTMLElement | null = null;
  #svg: SVGSVGElement | null = null;
  #path: SVGPathElement | null = null;

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
    this.#disconnectObserver();
  }

  /** Synchronizes geometry clipping and stroke overlay with the current shape kind and size. */
  sync(): void {
    if (isServer) return;
    const target = this.#config.getTarget();
    if (!target) return;

    const rawKind = this.#config.getKind();
    const kind: CornerKind = isCornerKind(rawKind) ? rawKind : 'rounded';

    if (kind === 'rounded') {
      this.#disconnectObserver();
      if (target.style.clipPath) target.style.clipPath = '';
      this.#svg?.remove();
      this.#svg = null;
      this.#path = null;
      return;
    }

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

    if (this.host.isConnected && typeof ResizeObserver === 'function') {
      if (!this.#observer || this.#observedTarget !== target) {
        this.#disconnectObserver();
        this.#observer = new ResizeObserver(() => this.#paint(target, kind));
        this.#observer.observe(target);
        this.#observedTarget = target;
      }
    }

    this.#paint(target, kind);
  }

  #paint(target: HTMLElement, kind: CornerKind): void {
    const rect = target.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;

    const fallback = this.#config.fallbackRadius ?? 6;
    const inset = this.#config.strokeInset ?? 0.5;
    const rawRadius = Number.parseFloat(getComputedStyle(target).borderTopLeftRadius);
    const radius = Number.isFinite(rawRadius) && rawRadius > 0 ? rawRadius : fallback;
    const spec = { kind, radius };

    target.style.clipPath = toClipPath(w, h, spec);
    this.#svg?.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.#path?.setAttribute('d', toSvgPath(w, h, spec, inset));
  }

  #disconnectObserver(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#observedTarget = null;
  }
}
