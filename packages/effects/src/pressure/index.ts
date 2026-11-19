import { isServer, type ReactiveController, type ReactiveControllerHost } from '@kerno/core';
import { prefersReducedMotion } from '../motion/index.js';

export interface PressureOptions {
  /** Maximum tilt angle in degrees at edges. Defaults to `4`. */
  maxTilt?: number;
  /** Scale factor when pressed at center. Defaults to `0.985`. */
  pressScale?: number;
  /** Perspective distance in pixels. Defaults to `600`. */
  perspective?: number;
}

export interface TiltTransform {
  rotateX: number;
  rotateY: number;
  scale: number;
  cssTransform: string;
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

  /** Applies pressure at `(localX, localY)` relative to the host's top-left corner. */
  pressAt(localX: number, localY: number): void {
    if (!this.#enabled || prefersReducedMotion()) return;
    const rect = this.host.getBoundingClientRect();
    const { cssTransform } = computePressureTransform(
      localX,
      localY,
      rect.width,
      rect.height,
      this.#options,
    );
    this.#pressed = true;
    this.host.style.transform = cssTransform;
  }

  reset(): void {
    if (!this.#pressed && !this.host.style.transform) return;
    this.#pressed = false;
    this.host.style.transform = '';
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
