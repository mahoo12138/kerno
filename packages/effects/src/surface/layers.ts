import {
  paintAcrylicCanvas,
  resolveAcrylicParams,
  type AcrylicMaterialParams,
} from '../acrylic/index.js';
import type { Quad, ShapeSpec } from '../shape/index.js';

export interface SurfaceRenderState {
  readonly host: HTMLElement;
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
  readonly shape: ShapeSpec;
  readonly fillPath: Path2D;
  readonly strokePath: Path2D;
  readonly strokeWidth: number;
  readonly borderWidths?: Quad<number>;
  readonly borderRingPath?: Path2D;
  readonly fillColor: string;
  readonly strokeColor: string;
  readonly acrylic: boolean;
  readonly acrylicOverrides?: Partial<AcrylicMaterialParams>;
}

/**
 * Composable visual layer painted onto a `<k-surface>` canvas.
 * Future effects (Reveal Highlight, Pressure/Specular) implement this interface.
 */
export interface SurfaceLayer {
  readonly id: string;
  draw(ctx: CanvasRenderingContext2D, state: SurfaceRenderState): void;
  destroy?(): void;
}

/** Paints either the solid surface fill or the Acrylic material (tint + procedural noise). */
export const backgroundLayer: SurfaceLayer = {
  id: 'background',
  draw(ctx, state) {
    if (state.acrylic) {
      const params = resolveAcrylicParams(state.host, state.acrylicOverrides);
      paintAcrylicCanvas(ctx, state.fillPath, params);
      return;
    }
    if (
      !state.fillColor ||
      state.fillColor === 'transparent' ||
      state.fillColor === 'rgba(0, 0, 0, 0)'
    ) {
      return;
    }
    ctx.save();
    ctx.fillStyle = state.fillColor;
    ctx.fill(state.fillPath);
    ctx.restore();
  },
};

/**
 * Paints the crisp shape-conforming border ring using the even-odd rule
 * (supporting independent per-side border widths around any parametric shape),
 * falling back to uniform path stroking when no ring path is supplied.
 */
export const borderLayer: SurfaceLayer = {
  id: 'border',
  draw(ctx, state) {
    const hasBorder = state.borderWidths
      ? state.borderWidths.some((w) => w > 0)
      : state.strokeWidth > 0;
    if (
      !hasBorder ||
      !state.strokeColor ||
      state.strokeColor === 'transparent' ||
      state.strokeColor === 'rgba(0, 0, 0, 0)'
    ) {
      return;
    }
    ctx.save();
    if (state.borderRingPath) {
      ctx.fillStyle = state.strokeColor;
      ctx.fill(state.borderRingPath, 'evenodd');
    } else {
      ctx.lineWidth = state.strokeWidth;
      ctx.strokeStyle = state.strokeColor;
      ctx.lineJoin = 'round';
      ctx.stroke(state.strokePath);
    }
    ctx.restore();
  },
};

export const defaultSurfaceLayers: readonly SurfaceLayer[] = [backgroundLayer, borderLayer];
