import { isServer, type ReactiveController, type ReactiveControllerHost } from '@kerno/core';
import { prefersReducedMotion } from '../motion/index.js';

export type TiltMode = 'absolute' | 'relative';

export interface PressureOptions {
  /** Tilt calculation mode: `'absolute'` (physical pixel sink depth) or `'relative'` (maxTilt degrees). */
  mode?: TiltMode;
  /** Maximum tilt angle in degrees at edges (used in `'relative'` mode). Defaults to `4`. */
  maxTilt?: number;
  /** Physical edge depression depth in pixels (used in `'absolute'` mode). Defaults to `1.5`. */
  depth?: number;
  /** Center Z depression depth in pixels (used in `'absolute'` mode). Defaults to `0.8`. */
  zoom?: number;
  /** Invert tilt direction (pull toward viewer instead of pushing away). Defaults to `false`. */
  invert?: boolean;
  /** Scale factor when pressed at center (used in `'relative'` mode). Defaults to `0.985`. */
  pressScale?: number;
  /** Perspective distance in pixels. Defaults to `600`. */
  perspective?: number;
  /** Optional custom transform writer (avoids mutating `host.style.transform` when parent layouts position host via transform). */
  onTransform?: (cssTransform: string | null) => void;
}

export interface TiltTransform {
  rotateX: number;
  rotateY: number;
  translateZ?: number;
  scale: number;
  cssTransform: string;
}

/**
 * Computes Axiom / WinUI physical 3D tilt where the pressed edge sinks by an
 * exact pixel `depth` (`arcsin(depth / halfAxis)`) regardless of element size,
 * and center presses sink along Z by `zoom` pixels (`ax-design/surface/src/tilt.ts`).
 */
export function computePhysicalTilt(
  localX: number,
  localY: number,
  width: number,
  height: number,
  options: PressureOptions = {},
): TiltTransform {
  if (width <= 0 || height <= 0) {
    return { rotateX: 0, rotateY: 0, translateZ: 0, scale: 1, cssTransform: 'none' };
  }
  const depth = options.depth ?? 1.5;
  const zoom = options.zoom ?? 0.8;
  const perspective = options.perspective ?? 600;
  const sign = options.invert ? -1 : 1;

  const halfW = width / 2;
  const halfH = height / 2;
  const cx = Math.max(-halfW, Math.min(halfW, localX - halfW));
  const cy = Math.max(-halfH, Math.min(halfH, localY - halfH));

  let degX: number;
  let degY: number;
  if (options.mode === 'relative') {
    const maxDeg = options.maxTilt ?? 10;
    degX = (cx / halfW) * maxDeg;
    degY = (cy / halfH) * maxDeg;
  } else {
    const sinX = Math.min(0.99, Math.max(0, depth / halfW));
    const sinY = Math.min(0.99, Math.max(0, depth / halfH));
    degX = (((cx / halfW) * Math.asin(sinX) * 180) / Math.PI) * 2;
    degY = (((cy / halfH) * Math.asin(sinY) * 180) / Math.PI) * 2;
  }

  const rotateX = Number((-degY * sign).toFixed(3));
  const rotateY = Number((degX * sign).toFixed(3));
  const denom = halfW * halfW + halfH * halfH;
  const zRatio = denom > 0 ? (cx * cx + cy * cy) / denom - 1 : 0;
  const translateZ = Number((zRatio * zoom * sign).toFixed(3));

  return {
    rotateX,
    rotateY,
    translateZ,
    scale: 1,
    cssTransform: `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${translateZ}px)`,
  };
}

/**
 * Computes a 3D perspective tilt and depression transform from a pointer
 * press at `(localX, localY)` on a surface of `(width × height)`.
 */
export function computePressureTransform(
  localX: number,
  localY: number,
  width: number,
  height: number,
  options: PressureOptions = {},
): TiltTransform {
  if (options.mode === 'absolute') {
    return computePhysicalTilt(localX, localY, width, height, options);
  }
  const maxTilt = options.maxTilt ?? 4;
  const pressScale = options.pressScale ?? 0.985;
  const perspective = options.perspective ?? 600;

  if (width <= 0 || height <= 0) {
    return { rotateX: 0, rotateY: 0, scale: 1, cssTransform: 'none' };
  }

  // Normalized coordinates in [-1, 1] from center
  const nx = Math.max(-1, Math.min(1, (localX / width) * 2 - 1));
  const ny = Math.max(-1, Math.min(1, (localY / height) * 2 - 1));

  // Pressing top tilts top away (-rotateX); pressing right tilts right away (+rotateY)
  const rotateX = Number((-ny * maxTilt).toFixed(2));
  const rotateY = Number((nx * maxTilt).toFixed(2));
  const scale = pressScale;

  return {
    rotateX,
    rotateY,
    scale,
    cssTransform: `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
  };
}

/**
 * Reactive controller applying tactile press/tilt feedback to a host element
 * on pointer press, automatically respecting `prefers-reduced-motion`.
 */
export class PressureController implements ReactiveController {
  readonly host: ReactiveControllerHost & HTMLElement;
  #enabled = false;
  #options: PressureOptions;
  #listening = false;
  #pressed = false;

  constructor(host: ReactiveControllerHost & HTMLElement, options: PressureOptions = {}) {
    this.host = host;
    this.#options = options;
    host.addController(this);
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  set enabled(value: boolean) {
    if (this.#enabled === value) return;
    this.#enabled = value;
    this.#syncListeners();
    if (!value) this.reset();
  }

  get isPressed(): boolean {
    return this.#pressed;
  }

  /** Overrides how the computed tilt CSS transform is applied (e.g., to internal shadow planes). */
  setTransformHandler(handler: ((cssTransform: string | null) => void) | undefined): void {
    this.#options = { ...this.#options, ...(handler ? { onTransform: handler } : {}) };
    if (!handler) delete this.#options.onTransform;
  }

  /** Applies pressure at `(localX, localY)` relative to the host's top-left corner. */
  pressAt(localX: number, localY: number): void {
    if (!this.#enabled || prefersReducedMotion()) return;
    const rect = this.host.getBoundingClientRect();
    const opts: PressureOptions = { ...this.#options };
    if (typeof getComputedStyle === 'function') {
      const cs = getComputedStyle(this.host);
      const rawMode = cs.getPropertyValue('--k-tilt-mode').trim();
      if (rawMode === 'relative' || rawMode === 'absolute') opts.mode = rawMode;
      const rawDepth = Number.parseFloat(cs.getPropertyValue('--k-tilt-depth'));
      if (Number.isFinite(rawDepth) && rawDepth >= 0) opts.depth = rawDepth;
      const rawZoom = Number.parseFloat(cs.getPropertyValue('--k-tilt-zoom'));
      if (Number.isFinite(rawZoom) && rawZoom >= 0) opts.zoom = rawZoom;
      const rawPersp = Number.parseFloat(cs.getPropertyValue('--k-tilt-perspective'));
      if (Number.isFinite(rawPersp) && rawPersp > 0) opts.perspective = rawPersp;
    }
    const { cssTransform } = computePressureTransform(
      localX,
      localY,
      rect.width,
      rect.height,
      opts,
    );
    this.#pressed = true;
    if (this.#options.onTransform) {
      this.#options.onTransform(cssTransform);
    } else {
      this.host.style.transform = cssTransform;
    }
  }

  reset(): void {
    if (!this.#pressed) return;
    this.#pressed = false;
    if (this.#options.onTransform) {
      this.#options.onTransform(null);
    } else {
      this.host.style.transform = '';
    }
  }

  hostConnected(): void {
    this.#syncListeners();
  }

  hostDisconnected(): void {
    this.#removeListeners();
    this.reset();
  }

  #syncListeners(): void {
    if (isServer) return;
    if (this.#enabled && this.host.isConnected && !this.#listening) {
      this.#listening = true;
      this.host.addEventListener('pointerdown', this.#onPointerDown);
      window.addEventListener('pointerup', this.#onPointerUp, { passive: true });
      window.addEventListener('pointercancel', this.#onPointerUp, { passive: true });
    } else if ((!this.#enabled || !this.host.isConnected) && this.#listening) {
      this.#removeListeners();
    }
  }

  #removeListeners(): void {
    if (!this.#listening) return;
    this.#listening = false;
    this.host.removeEventListener('pointerdown', this.#onPointerDown);
    window.removeEventListener('pointerup', this.#onPointerUp);
    window.removeEventListener('pointercancel', this.#onPointerUp);
  }

  #onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const rect = this.host.getBoundingClientRect();
    this.pressAt(event.clientX - rect.left, event.clientY - rect.top);
  };

  #onPointerUp = (): void => {
    this.reset();
  };
}
