import { applyTheme, generateTokensCss } from '@kerno/tokens';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import {
  DEFAULT_PRESS_SPEED,
  DEFAULT_RELEASE_ACCELERATE_RATE,
  advancePressAnimation,
  applyPressGradientStops,
  boxShadowToDropShadow,
  clampRadii,
  computePressureTransform,
  createPath2D,
  fadeIn,
  flushFrames,
  getNoiseTile,
  isRoundedOnly,
  normalizeElevation,
  normalizeShape,
  paintAcrylicCanvas,
  parseColorToRgba,
  parseDurationMs,
  parseRadius,
  resolveDurationMs,
  scaleIn,
  scheduleFrame,
  slideIn,
  toClipPath,
  toMaskImage,
  toSvgPath,
  type KSurface,
  type PressTimeline,
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
      tintOpacity: 0.55,
      blur: '24px',
      saturation: '190%',
      brightness: '104%',
      noiseOpacity: 0.05,
      border: 'rgba(255, 255, 255, 0.5)',
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
    const backdrop = el.shadowRoot!.querySelector<HTMLElement>('.backdrop')!;
    const shadowCanvas = el.shadowRoot!.querySelector<HTMLCanvasElement>('.shadow-canvas')!;
    expect(clip.style.clipPath).toContain('path(');
    // In Chromium, non-rectangular acrylic backdrop is clipped via SVG mask-image
    // (avoiding Blink's bug where clip-path is ignored for backdrop-filter inside
    // rounded overflow:hidden ancestors).
    expect(toMaskImage(160, 80, { kind: 'chamfer', radius: 10 })).toContain('data:image/svg+xml');
    expect(backdrop.style.maskImage).toContain('data:image/svg+xml');
    expect(backdrop.style.clipPath).toBe('');
    // Non-rectangular elevation paints to sibling shadowCanvas without putting CSS filter on host
    // (preserving backdrop-filter sampling on Acrylic surfaces).
    expect(el.style.filter).toBe('');
    expect(shadowCanvas.hidden).toBe(false);
    expect(shadowCanvas.width).toBeGreaterThan(160);
    expect(customLayerDraw).toHaveBeenCalled();
    expect(el.surface.paintCount).toBeGreaterThan(0);

    // Switching back to rounded clears mask-image and uses native border-radius.
    el.shape = 'rounded';
    await el.updateComplete;
    flushFrames();
    expect(backdrop.style.maskImage).toBe('');
    expect(backdrop.style.borderRadius).toBe('10px');
  });

  it('aligns .backdrop, .canvas and .clip to full host height under min-height', async () => {
    document.body.innerHTML = `
      <k-surface
        shape="chamfer"
        radius="16"
        elevation="4"
        acrylic
        style="width: 280px; min-height: 180px"
      >Short content</k-surface>
    `;
    const el = document.querySelector('k-surface') as KSurface;
    await el.updateComplete;
    flushFrames();

    const hostRect = el.getBoundingClientRect();
    const backdropRect = el.shadowRoot!.querySelector('.backdrop')!.getBoundingClientRect();
    const canvasRect = el.shadowRoot!.querySelector('.canvas')!.getBoundingClientRect();
    const clipRect = el.shadowRoot!.querySelector('.clip')!.getBoundingClientRect();

    expect(hostRect.height).toBeCloseTo(180, 0);
    expect(backdropRect.height).toBeCloseTo(hostRect.height, 0);
    expect(canvasRect.height).toBeCloseTo(hostRect.height, 0);
    expect(clipRect.height).toBeCloseTo(hostRect.height, 0);
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

describe('Reveal Highlight & Pressure', () => {
  it('paints Reveal Highlight layer when pointer is positioned on <k-surface reveal>', async () => {
    document.body.innerHTML = `<k-surface reveal style="width: 120px; height: 60px">Reveal</k-surface>`;
    const el = document.querySelector('k-surface') as KSurface;
    await el.updateComplete;
    flushFrames();
    const initialPaints = el.surface.paintCount;

    el.revealController.setPointerPosition({ x: 40, y: 30 });
    flushFrames();
    expect(el.revealController.point).toEqual({ x: 40, y: 30, inside: true });
    expect(el.surface.paintCount).toBe(initialPaints + 1);

    el.revealController.triggerPress(40, 30);
    flushFrames();
    expect(el.surface.paintCount).toBeGreaterThan(initialPaints + 1);

    el.revealController.setPointerPosition(null);
    flushFrames();
    expect(el.revealController.point).toBeNull();
  });

  it('matches WinUI / Axiom press timeline (2000ms linear, 7x release acceleration, 3-stop gradient)', () => {
    expect(DEFAULT_PRESS_SPEED).toBe(2000);
    expect(DEFAULT_RELEASE_ACCELERATE_RATE).toBe(6);
    expect(parseColorToRgba('rgba(255, 255, 255, 0.45)')).toEqual({
      rgb: '255, 255, 255',
      alpha: 0.45,
    });
    expect(parseColorToRgba('#0078d4')).toEqual({ rgb: '0, 120, 212', alpha: 1 });

    const timeline: PressTimeline = {
      startFrame: null,
      currentFrame: null,
      releasedFrame: null,
      logicFrame: null,
      pressed: true,
      released: false,
      hasUp: false,
      downX: 10,
      downY: 10,
      upX: 10,
      upY: 10,
    };

    // Frame 0 at t=1000ms -> logicFrame = 0
    expect(advancePressAnimation(timeline, 1000)).toBe(false);
    expect(timeline.logicFrame).toBe(0);

    // Held 400ms (t=1400ms) -> linear 400 / 2000 = 0.2
    expect(advancePressAnimation(timeline, 1400)).toBe(false);
    expect(timeline.logicFrame).toBeCloseTo(0.2, 5);

    // Released at currentFrame=400; 100ms later (t=1500ms):
    // unitLogicFrame = 500 + (500 - 400) * 6 = 1100 -> 1100 / 2000 = 0.55
    timeline.released = true;
    timeline.releasedFrame = timeline.currentFrame;
    expect(advancePressAnimation(timeline, 1500)).toBe(false);
    expect(timeline.logicFrame).toBeCloseTo(0.55, 5);

    // 250ms after release (t=1650ms): 650 + 250 * 6 = 2150 > 2000 -> finished
    expect(advancePressAnimation(timeline, 1650)).toBe(true);

    // Verify 3-stop gradient curves at frame=0 and frame=0.5
    const stops0: [number, string][] = [];
    applyPressGradientStops(
      { addColorStop: (o: number, c: string) => stops0.push([o, c]) } as CanvasGradient,
      '255, 255, 255',
      0.5,
      0,
    );
    expect(stops0).toEqual([
      [0, 'rgba(255, 255, 255, 0.1)'],
      [0.05500000000000001, 'rgba(255, 255, 255, 0.05)'],
      [0.1, 'rgba(255, 255, 255, 0)'],
    ]);

    const stopsMid: [number, string][] = [];
    applyPressGradientStops(
      { addColorStop: (o: number, c: string) => stopsMid.push([o, c]) } as CanvasGradient,
      '255, 255, 255',
      0.5,
      0.5,
    );
    expect(stopsMid[0]).toEqual([0, 'rgba(255, 255, 255, 0)']);
    expect(stopsMid[1]![0]).toBeCloseTo(0.275, 5);
    expect(stopsMid[2]![0]).toBeCloseTo(0.5, 5);
  });

  it('accelerates press ripple on mouse release and clears immediately on touch release', async () => {
    document.body.innerHTML = `<k-surface reveal style="width: 160px; height: 80px">Tap</k-surface>`;
    const el = document.querySelector('k-surface') as KSurface;
    await el.updateComplete;
    flushFrames();

    el.revealController.triggerPress(80, 40);
    flushFrames();
    expect(el.revealController.press?.pressed).toBe(true);
    expect(el.revealController.pressRemaining()).toBeGreaterThan(0);

    el.revealController.releasePress(82, 42, 'mouse');
    expect(el.revealController.press?.released).toBe(true);
    expect(el.revealController.press?.upX).toBe(82);

    // Touch release clears ripple immediately like WinUI / Axiom
    el.revealController.triggerPress(80, 40);
    flushFrames();
    el.revealController.releasePress(80, 40, 'touch');
    expect(el.revealController.press).toBeNull();
  });

  it('computes 3D perspective tilt transform and applies pressure on <k-surface pressure>', async () => {
    const topRight = computePressureTransform(100, 0, 100, 50, { maxTilt: 4 });
    expect(topRight.rotateX).toBe(4);
    expect(topRight.rotateY).toBe(4);
    expect(topRight.cssTransform).toContain('perspective(600px)');

    document.body.innerHTML = `<k-surface pressure style="width: 100px; height: 50px">Press</k-surface>`;
    const el = document.querySelector('k-surface') as KSurface;
    await el.updateComplete;
    el.pressureController.pressAt(100, 0);
    expect(el.pressureController.isPressed).toBe(true);
    expect(el.style.transform).toContain('rotateX(4deg)');
    el.pressureController.reset();
    expect(el.pressureController.isPressed).toBe(false);
    expect(el.style.transform).toBe('');
  });

  it('auto-invalidates <k-surface> on theme/style changes without repainting on transform-only pressure', async () => {
    document.body.innerHTML = `<k-surface pressure style="width: 100px; height: 50px">Auto</k-surface>`;
    const el = document.querySelector('k-surface') as KSurface;
    await el.updateComplete;
    flushFrames();
    const afterMount = el.surface.paintCount;

    // Theme change via applyTheme() automatically invalidates the surface
    const dispose = applyTheme('dark', document.body);
    flushFrames();
    expect(el.surface.paintCount).toBe(afterMount + 1);

    // Inline CSS variable change automatically invalidates
    el.style.setProperty('--k-surface-bg', 'rgb(10, 20, 30)');
    await Promise.resolve(); // allow MutationObserver microtask
    flushFrames();
    const afterBg = el.surface.paintCount;
    expect(afterBg).toBeGreaterThan(afterMount + 1);

    // Compositor-only transform from PressureController must NOT trigger canvas repaints
    el.pressureController.pressAt(20, 20);
    await Promise.resolve();
    flushFrames();
    expect(el.surface.paintCount).toBe(afterBg);

    dispose();
  });

  it('repaints off-screen <k-surface> immediately with new theme colors upon becoming visible', async () => {
    const disposeDark = applyTheme('dark', document.body);
    document.body.innerHTML = `<k-surface style="width: 100px; height: 50px">Theme</k-surface>`;
    const el = document.querySelector('k-surface') as KSurface;
    await el.updateComplete;
    flushFrames();

    const canvas = el.shadowRoot!.querySelector<HTMLCanvasElement>('.canvas')!;
    const ctx = canvas.getContext('2d')!;
    const darkPixel = ctx.getImageData(20, 20, 1, 1).data;
    // Dark bg.layer is #232327 (35, 35, 39)
    expect(darkPixel[0]).toBeLessThan(60);

    // Go off-screen, switch to light theme, then scroll back into view
    el.surface.setVisible(false);
    disposeDark();
    const disposeLight = applyTheme('light', document.body);
    el.surface.setVisible(true);

    // Must have repainted synchronously on becoming visible (no stale dark pixels!)
    const lightPixel = ctx.getImageData(20, 20, 1, 1).data;
    expect([lightPixel[0], lightPixel[1], lightPixel[2]]).toEqual([255, 255, 255]);

    disposeLight();
  });
});
