import { KernoElement, prop, type PropertyValues } from '@kerno/core';
import type { AcrylicMaterialParams } from '../acrylic/index.js';
import type { ElevationLevel } from '../elevation/index.js';
import { PressureController } from '../pressure/index.js';
import { RevealController } from '../reveal/index.js';
import { isCornerKind, parseRadius, type CornerKind, type ShapeInput } from '../shape/index.js';
import { SurfaceController } from './controller.js';
import { defaultSurfaceLayers, type SurfaceLayer } from './layers.js';
import { surfaceStyles } from './surface.styles.js';

/**
 * Unified visual surface container supporting parametric shapes (`rounded`,
 * `chamfer`, `scallop`, `notch`), Acrylic translucent material, shape-aware
 * elevation, and custom canvas render layers.
 *
 * @tag k-surface
 *
 * @slot - Surface content.
 *
 * @csspart clip - Clipped backdrop and shadow receiver.
 * @csspart canvas - Internal 2D rendering canvas.
 * @csspart content - Foreground content container.
 *
 * @cssprop --k-surface-bg
 * @cssprop --k-surface-border-color
 * @cssprop --k-surface-border-width
 * @cssprop --k-surface-padding
 * @cssprop --k-surface-radius
 */
export class KSurface extends KernoElement {
  static override styles = surfaceStyles;
  static override template = /* html */ `<canvas part="shadow" class="shadow-canvas" aria-hidden="true" hidden></canvas><div part="clip" class="clip"><canvas part="canvas" class="canvas" aria-hidden="true"></canvas><div part="content" class="content"><slot></slot></div></div>`;

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

  readonly surface = new SurfaceController(this);
  readonly revealController = new RevealController(
    this,
    () => this.surface.invalidate(),
    () => this.surface.isVisible,
  );
  readonly pressureController = new PressureController(this);
  readonly #revealLayer = this.revealController.createLayer();

  #shadowCanvas!: HTMLCanvasElement;
  #clip!: HTMLDivElement;
  #canvas!: HTMLCanvasElement;

  protected override setup(): void {
    this.#shadowCanvas = this.renderRoot.querySelector('.shadow-canvas') as HTMLCanvasElement;
    this.#clip = this.renderRoot.querySelector('.clip') as HTMLDivElement;
    this.#canvas = this.renderRoot.querySelector('.canvas') as HTMLCanvasElement;

    this.surface.bind({
      canvas: this.#canvas,
      shadowCanvas: this.#shadowCanvas,
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
