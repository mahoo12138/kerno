import { KernoElement, prop, type PropertyValues } from '@kerno/core';
import type { AcrylicMaterialParams } from '../acrylic/index.js';
import type { ElevationLevel } from '../elevation/index.js';
import { PressureController } from '../pressure/index.js';
import { RevealController } from '../reveal/index.js';
import { isCornerKind, parseRadius, type CornerKind, type ShapeInput } from '../shape/index.js';
import { SurfaceController } from './controller.js';
import { defaultSurfaceLayers, type SurfaceLayer } from './layers.js';
import { surfaceStyles } from './surface.styles.js';

export interface SurfaceMotionState {
  rotateX?: number;
  rotateY?: number;
  perspective?: number;
  originX?: number;
  originY?: number;
  scale?: number;
  x?: number;
  y?: number;
  opacity?: number;
}

/**
 * Unified visual surface container supporting parametric shapes (`rounded`,
 * `chamfer`, `scallop`, `notch`), Acrylic translucent material, shape-aware
 * elevation, and custom canvas render layers.
 *
 * @tag k-surface
 *
 * @slot - Surface content.
 *
 * @csspart shadow - Non-rectangular knockout elevation shadow canvas.
 * @csspart backdrop - Shape-clipped Acrylic `backdrop-filter` layer.
 * @csspart canvas - Internal 2D rendering canvas.
 * @csspart clip - Shape-clipped foreground container.
 * @csspart content - Foreground content wrapper.
 *
 * @cssprop --k-surface-bg
 * @cssprop --k-surface-border-color
 * @cssprop --k-surface-border-width
 * @cssprop --k-surface-padding
 * @cssprop --k-surface-radius
 */
export class KSurface extends KernoElement {
  static override styles = surfaceStyles;
  static override template = /* html */ `<canvas part="shadow" class="shadow-canvas" aria-hidden="true" hidden></canvas><div part="backdrop" class="backdrop" aria-hidden="true"></div><canvas part="canvas" class="canvas" aria-hidden="true"></canvas><div part="clip" class="clip"><div part="content" class="content"><slot></slot></div></div>`;

  /** Corner geometry family (`'rounded' | 'chamfer' | 'scallop' | 'notch'`). */
  @prop({ reflect: true }) accessor shape: CornerKind = 'rounded';

  /**
   * Corner radius in CSS pixels (single number or 1–4 space-separated numbers).
   * When omitted, falls back to the computed `--k-surface-radius` / `--k-radius-lg` token.
   */
  @prop({ reflect: true }) accessor radius = '';

  /** Elevation depth level (`0..5`). */
  @prop({ type: Number, reflect: true }) accessor elevation: ElevationLevel = 0;

  /** Enables Acrylic translucent blur, tint and procedural grain. */
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;

  /** Forces the opaque fallback fill when Acrylic is active. */
  @prop({ type: Boolean, attribute: 'reduced-transparency', reflect: true })
  accessor reducedTransparency = false;

  /** Optional Acrylic tint color override. */
  @prop() accessor tint = '';

  /** Enables pointer-tracked Reveal Highlight illumination on fill and border. */
  @prop({ type: Boolean, reflect: true }) accessor reveal = false;

  /** Enables tactile 3D tilt/depression feedback on pointer press. */
  @prop({ type: Boolean, reflect: true }) accessor pressure = false;

  /** Custom render layers; defaults to `[backgroundLayer, borderLayer]`. */
  @prop({ attribute: false }) accessor layers: readonly SurfaceLayer[] = defaultSurfaceLayers;

  /** Set to `true` when an ancestor (such as `<k-tile-group>`) takes over an active press gesture. */
  pressTakenOver = false;

  readonly surface = new SurfaceController(this);
  readonly revealController = new RevealController(
    this,
    () => this.surface.invalidate(),
    () => this.surface.isVisible,
  );
  readonly pressureController = new PressureController(this);
  readonly #revealLayer = this.revealController.createLayer();

  #shadowCanvas!: HTMLCanvasElement;
  #backdrop!: HTMLDivElement;
  #clip!: HTMLDivElement;
  #canvas!: HTMLCanvasElement;

  protected override setup(): void {
    this.#shadowCanvas = this.renderRoot.querySelector('.shadow-canvas') as HTMLCanvasElement;
    this.#backdrop = this.renderRoot.querySelector('.backdrop') as HTMLDivElement;
    this.#clip = this.renderRoot.querySelector('.clip') as HTMLDivElement;
    this.#canvas = this.renderRoot.querySelector('.canvas') as HTMLCanvasElement;

    this.surface.bind({
      canvas: this.#canvas,
      shadowCanvas: this.#shadowCanvas,
      backdropTarget: this.#backdrop,
      clipTarget: this.#clip,
      getShape: () => this.#resolveShape(),
      getElevation: () => this.elevation,
      getAcrylic: () => this.acrylic,
      getAcrylicOverrides: () => this.#resolveAcrylicOverrides(),
      getFillColor: () => this.#readCssVar('--_bg', '#ffffff'),
      getStrokeColor: () => this.#readCssVar('--_border-color', 'transparent'),
      getStrokeWidth: () => Number.parseFloat(this.#readCssVar('--_border-width', '1')) || 0,
      getLayers: () => (this.reveal ? [...this.layers, this.#revealLayer] : this.layers),
      onEnvironmentChange: () => this.revealController.invalidateCache(),
    });
  }

  protected override update(_changed: PropertyValues): void {
    this.revealController.enabled = this.reveal;
    this.pressureController.enabled = this.pressure;
  }

  /** Forces an immediate synchronous canvas paint. */
  paintNow(): void {
    this.surface.paintNow();
  }

  /**
   * Programmatically presses the surface at `at` (or `'center'`) to trigger
   * Reveal ripple and 3D Pressure tilt feedback.
   */
  press(at: { x: number; y: number } | 'center' = 'center'): void {
    this.pressTakenOver = false;
    const rect = this.getBoundingClientRect();
    const x = at === 'center' ? rect.width / 2 : at.x;
    const y = at === 'center' ? rect.height / 2 : at.y;
    if (this.reveal) this.revealController.triggerPress(x, y);
    if (this.pressure) this.pressureController.pressAt(x, y);
  }

  /**
   * Releases an active press (called on keyboard keyup or when `<k-tile-group>`
   * lifts a tile into a drag gesture).
   */
  release(takenOver = false): void {
    if (takenOver) this.pressTakenOver = true;
    this.revealController.releasePress(undefined, undefined, 'keyboard');
    this.pressureController.reset();
  }

  /** Milliseconds remaining in the current press ripple / tilt feedback. */
  pressRemaining(): number {
    const revealMs = this.reveal ? this.revealController.pressRemaining() : 0;
    const tiltMs = this.pressure && this.pressureController.isPressed ? 50 : 0;
    return Math.max(revealMs, tiltMs);
  }

  /**
   * Applies external 3D motion (used by `<k-tile>` flip launch and
   * `<k-tile-group>` turnstile/entrance animations) to internal surface planes
   * without making `:host` an opacity backdrop root.
   */
  motion(state: SurfaceMotionState | null): void {
    const planes: HTMLElement[] = [
      this.#shadowCanvas,
      this.#backdrop,
      this.#canvas,
      this.#clip,
    ].filter(Boolean);
    if (!state) {
      for (const el of planes) {
        el.style.transform = '';
        el.style.transformOrigin = '';
        el.style.opacity = '';
      }
      return;
    }
    const parts: string[] = [];
    if (state.x || state.y) {
      parts.push(`translate(${state.x ?? 0}px, ${state.y ?? 0}px)`);
    }
    if (state.scale !== undefined && state.scale !== 1) {
      parts.push(`scale(${state.scale})`);
    }
    if (state.perspective && (state.rotateX || state.rotateY)) {
      parts.push(`perspective(${state.perspective}px)`);
    }
    if (state.rotateX) parts.push(`rotateX(${state.rotateX}deg)`);
    if (state.rotateY) parts.push(`rotateY(${state.rotateY}deg)`);
    const transform = parts.join(' ');
    const origin =
      state.originX !== undefined || state.originY !== undefined
        ? `${state.originX ?? 0}px ${state.originY ?? 0}px`
        : '';
    const opacity = state.opacity !== undefined && state.opacity < 1 ? String(state.opacity) : '';
    for (const el of planes) {
      el.style.transform = transform;
      el.style.transformOrigin = origin;
      el.style.opacity = opacity;
    }
  }

  #resolveShape(): ShapeInput {
    const kind: CornerKind = isCornerKind(this.shape) ? this.shape : 'rounded';
    if (this.radius.trim().length > 0) {
      return { kind, radius: parseRadius(this.radius, 8) };
    }
    const tokenRadius = Number.parseFloat(this.#readCssVar('--_radius', '8'));
    return { kind, radius: Number.isFinite(tokenRadius) ? tokenRadius : 8 };
  }

  #resolveAcrylicOverrides(): Partial<AcrylicMaterialParams> | undefined {
    const overrides: Partial<AcrylicMaterialParams> = {};
    if (this.tint) overrides.tint = this.tint;
    if (this.reducedTransparency) overrides.reducedTransparency = true;
    return overrides;
  }

  #readCssVar(name: string, fallback: string): string {
    if (typeof getComputedStyle === 'undefined') return fallback;
    return getComputedStyle(this).getPropertyValue(name).trim() || fallback;
  }
}
