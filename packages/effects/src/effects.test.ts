import { generateTokensCss } from '@kerno/tokens';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import {
  boxShadowToDropShadow,
  clampRadii,
  createPath2D,
  fadeIn,
  flushFrames,
  getNoiseTile,
  isRoundedOnly,
  normalizeElevation,
  normalizeShape,
  paintAcrylicCanvas,
  parseDurationMs,
  parseRadius,
  resolveDurationMs,
  scaleIn,
  scheduleFrame,
  slideIn,
  toClipPath,
  toSvgPath,
  type KSurface,
  type SurfaceLayer,
} from './index.js';

let tokenStyle: HTMLStyleElement;

beforeEach(() => {
  tokenStyle = document.createElement('style');
  tokenStyle.textContent = generateTokensCss();
  document.head.append(tokenStyle);
});

afterEach(() => {
  tokenStyle.remove();
  document.body.innerHTML = '';
});

describe('Shape geometry engine', () => {
  it('parses CSS radius shorthands and normalizes 4 corners', () => {
    expect(parseRadius(8)).toEqual([8, 8, 8, 8]);
    expect(parseRadius('12 4')).toEqual([12, 4, 12, 4]);
    expect(parseRadius('10 20 30')).toEqual([10, 20, 30, 20]);
    expect(parseRadius('1 2 3 4')).toEqual([1, 2, 3, 4]);

    const spec = normalizeShape({
      kind: 'chamfer',
      radius: '12 6',
      bottomRight: { kind: 'notch', radius: 16 },
    });
    expect(spec.topLeft).toEqual({ kind: 'chamfer', radius: 12 });
    expect(spec.topRight).toEqual({ kind: 'chamfer', radius: 6 });
    expect(spec.bottomRight).toEqual({ kind: 'notch', radius: 16 });
    expect(isRoundedOnly(spec)).toBe(false);
    expect(isRoundedOnly({ kind: 'rounded', radius: 8 })).toBe(true);
  });

  it('proportionally clamps overlapping corner radii per CSS spec', () => {
    const clamped = clampRadii(100, 20, { kind: 'rounded', radius: 20 });
    expect(clamped.topLeft.radius).toBe(10);
    expect(clamped.bottomRight.radius).toBe(10);
  });

  it('generates distinct SVG and clip-path commands for rounded, chamfer, scallop and notch', () => {
    const rounded = toSvgPath(100, 40, { kind: 'rounded', radius: 10 });
    const chamfer = toSvgPath(100, 40, { kind: 'chamfer', radius: 10 });
    const scallop = toSvgPath(100, 40, { kind: 'scallop', radius: 10 });
    const notch = toSvgPath(100, 40, { kind: 'notch', radius: 10 });

    expect(rounded).toContain('A 10 10 0 0 1');
    expect(scallop).toContain('A 10 10 0 0 0');
    expect(chamfer).not.toContain('A ');
    expect(notch).toContain('L 90 10 L 100 10');
    expect(toClipPath(100, 40, { kind: 'chamfer', radius: 8 })).toMatch(/^path\('M 8 0 .+ Z'\)$/);
  });

  it('traces accurate Path2D contours for hit-testing corners vs center', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    for (const kind of ['rounded', 'chamfer', 'scallop', 'notch'] as const) {
      const path = createPath2D(100, 60, { kind, radius: 16 });
      // Center of the box is always inside.
      expect(ctx.isPointInPath(path, 50, 30)).toBe(true);
      // Extreme outer vertex (1, 1) is cut away by all 4 corner geometries when radius=16.
      expect(ctx.isPointInPath(path, 1, 1)).toBe(false);
    }
  });
});

describe('Elevation helpers', () => {
  it('clamps levels and converts multi-layer box-shadow to drop-shadow filters', () => {
    expect(normalizeElevation(-2)).toBe(0);
    expect(normalizeElevation('3')).toBe(3);
    expect(normalizeElevation(99)).toBe(5);

    const filter = boxShadowToDropShadow(
      '0 4px 8px rgba(0, 0, 0, 0.1), 0 0 2px 1px rgba(0, 0, 0, 0.08)',
    );
    expect(filter).toBe(
      'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) drop-shadow(0 0 2px rgba(0, 0, 0, 0.08))',
    );
  });
});

describe('Acrylic material', () => {
  it('caches a deterministic procedural noise tile and supports opaque fallback', () => {
    const tile1 = getNoiseTile(64);
    const tile2 = getNoiseTile(64);
    expect(tile1).not.toBeNull();
    expect(tile1).toBe(tile2);

    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    const path = createPath2D(40, 40, { kind: 'rounded', radius: 0 });

    paintAcrylicCanvas(ctx, path, {
      tint: '#ffffff',
      tintOpacity: 0.7,
      blur: '30px',
      saturation: '125%',
      noiseOpacity: 0.05,
      fallback: 'rgb(18, 52, 86)',
      reducedTransparency: true,
    });

    const pixel = ctx.getImageData(20, 20, 1, 1).data;
    expect([pixel[0], pixel[1], pixel[2], pixel[3]]).toEqual([18, 52, 86, 255]);
  });
});

describe('<k-surface> & FrameScheduler', () => {
  it('coalesces multiple frame tasks scheduled in the same tick', () => {
    const task = vi.fn();
    scheduleFrame(task);
    scheduleFrame(task);
    scheduleFrame(task);
    flushFrames();
    expect(task).toHaveBeenCalledOnce();
  });

  it('renders custom shapes, drop-shadow elevation, acrylic and custom layers', async () => {
    const customLayerDraw = vi.fn();
    const customLayer: SurfaceLayer = {
      id: 'custom-test',
      draw: customLayerDraw,
    };

    document.body.innerHTML = `
      <k-surface
        shape="chamfer"
        radius="10"
        elevation="3"
        acrylic
        style="width: 160px; height: 80px"
      >Hello</k-surface>
    `;
    const el = document.querySelector('k-surface') as KSurface;
    await el.updateComplete;
    el.layers = [...el.layers, customLayer];
    await el.updateComplete;
    flushFrames();

    const clip = el.shadowRoot!.querySelector<HTMLElement>('.clip')!;
    expect(clip.style.clipPath).toContain('path(');
    expect(el.style.filter).toContain('drop-shadow(');
    expect(customLayerDraw).toHaveBeenCalled();
    expect(el.surface.paintCount).toBeGreaterThan(0);
  });

  it('pauses painting while off-screen and repaints when visible again', async () => {
    document.body.innerHTML = `<k-surface style="width: 120px; height: 60px">Box</k-surface>`;
    const el = document.querySelector('k-surface') as KSurface;
    await el.updateComplete;
    flushFrames();
    const countBefore = el.surface.paintCount;

    el.surface.setVisible(false);
    el.shape = 'notch';
    await el.updateComplete;
    flushFrames();
    expect(el.surface.paintCount).toBe(countBefore);

    el.surface.setVisible(true);
    flushFrames();
    expect(el.surface.paintCount).toBe(countBefore + 1);
  });
});

describe('Motion system', () => {
  it('parses and resolves token durations and collapses to 0ms under reducedMotion', () => {
    expect(parseDurationMs('167ms')).toBe(167);
    expect(parseDurationMs('0.25s')).toBe(250);

    const el = document.createElement('div');
    document.body.append(el);
    expect(resolveDurationMs(el, 'fast', false)).toBe(83);
    expect(resolveDurationMs(el, 'fast', true)).toBe(0);
  });

  it('runs WAAPI presets and cancels conflicting animations with the same slot id', async () => {
    const el = document.createElement('div');
    document.body.append(el);

    const first = fadeIn(el, { duration: 120, reducedMotion: false });
    const second = fadeIn(el, { duration: 20, reducedMotion: false });
    expect(first.animation?.playState).toBe('idle');
    await second.finished;

    const scaled = scaleIn(el, { reducedMotion: true });
    expect(scaled.duration).toBe(0);
    await scaled.finished;

    const slid = slideIn(el, { y: 6 }, { reducedMotion: true });
    expect(slid.duration).toBe(0);
    await slid.finished;
  });
});
