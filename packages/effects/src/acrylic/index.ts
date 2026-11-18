import { isServer } from '@kerno/core';
import { tokenName } from '@kerno/tokens';

export interface AcrylicMaterialParams {
  tint: string;
  tintOpacity: number;
  blur: string;
  saturation: string;
  noiseOpacity: number;
  fallback: string;
  reducedTransparency: boolean;
}

const DEFAULT_ACRYLIC: Omit<AcrylicMaterialParams, 'reducedTransparency'> = {
  tint: '#fcfcfc',
  tintOpacity: 0.75,
  blur: '30px',
  saturation: '125%',
  noiseOpacity: 0.02,
  fallback: '#f9f9f9',
};

/**
 * Checks whether the environment or user preference requests reduced
 * transparency (or lacks `backdrop-filter` support).
 */
export function prefersReducedTransparency(): boolean {
  if (isServer) return false;
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-transparency: reduce)').matches
  ) {
    return true;
  }
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
    const supported =
      CSS.supports('backdrop-filter', 'blur(1px)') ||
      CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
    if (!supported) return true;
  }
  return false;
}

/**
 * Reads `--k-surface-acrylic-*` custom properties from `el` (with optional
 * overrides).
 */
export function resolveAcrylicParams(
  el: Element,
  overrides: Partial<AcrylicMaterialParams> = {},
): AcrylicMaterialParams {
  if (isServer || typeof getComputedStyle === 'undefined') {
    return {
      ...DEFAULT_ACRYLIC,
      reducedTransparency: false,
      ...overrides,
    };
  }
  const style = getComputedStyle(el);
  const read = (key: keyof typeof DEFAULT_ACRYLIC): string =>
    style.getPropertyValue(tokenName(`surface.acrylic.${key}` as const)).trim();

  const tint = overrides.tint ?? (read('tint') || DEFAULT_ACRYLIC.tint);
  const rawTintOpacity = Number.parseFloat(read('tintOpacity'));
  const tintOpacity =
    overrides.tintOpacity ??
    (Number.isFinite(rawTintOpacity) ? rawTintOpacity : DEFAULT_ACRYLIC.tintOpacity);
  const blur = overrides.blur ?? (read('blur') || DEFAULT_ACRYLIC.blur);
  const saturation = overrides.saturation ?? (read('saturation') || DEFAULT_ACRYLIC.saturation);
  const rawNoise = Number.parseFloat(read('noiseOpacity'));
  const noiseOpacity =
    overrides.noiseOpacity ?? (Number.isFinite(rawNoise) ? rawNoise : DEFAULT_ACRYLIC.noiseOpacity);
  const fallback = overrides.fallback ?? (read('fallback') || DEFAULT_ACRYLIC.fallback);
  const reducedTransparency = overrides.reducedTransparency ?? prefersReducedTransparency();

  return {
    tint,
    tintOpacity: Math.min(1, Math.max(0, tintOpacity)),
    blur,
    saturation,
    noiseOpacity: Math.min(1, Math.max(0, noiseOpacity)),
    fallback,
    reducedTransparency,
  };
}

const noiseTiles = new Map<number, HTMLCanvasElement>();

/**
 * Generates (and caches) a deterministic grayscale noise tile `<canvas>` of
 * `(size × size)` pixels. Zero network requests; shared across all Acrylic
 * surfaces in the document.
 */
export function getNoiseTile(size = 64): HTMLCanvasElement | null {
  if (isServer) return null;
  const cached = noiseTiles.get(size);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const image = ctx.createImageData(size, size);
  const data = image.data;
  // Deterministic xorshift32 PRNG for reproducible monochrome grain.
  let seed = 0x6d2b79f5;
  for (let i = 0; i < data.length; i += 4) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const v = (seed >>> 0) & 0xff;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  noiseTiles.set(size, canvas);
  return canvas;
}

/**
 * Draws the Acrylic tint and procedural noise grain inside `fillPath` on a 2D
 * canvas context. When `params.reducedTransparency` is true, draws the opaque
 * fallback fill and skips the noise pass.
 */
export function paintAcrylicCanvas(
  ctx: CanvasRenderingContext2D,
  fillPath: Path2D,
  params: AcrylicMaterialParams,
): void {
  ctx.save();
  if (params.reducedTransparency) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = params.fallback;
    ctx.fill(fillPath);
    ctx.restore();
    return;
  }

  if (params.tintOpacity > 0) {
    ctx.globalAlpha = params.tintOpacity;
    ctx.fillStyle = params.tint;
    ctx.fill(fillPath);
  }

  if (params.noiseOpacity > 0) {
    const tile = getNoiseTile();
    if (tile) {
      const pattern = ctx.createPattern(tile, 'repeat');
      if (pattern) {
        ctx.globalAlpha = params.noiseOpacity;
        ctx.fillStyle = pattern;
        ctx.fill(fillPath);
      }
    }
  }
  ctx.restore();
}
