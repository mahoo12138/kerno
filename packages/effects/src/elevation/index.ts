import { token, tokenName, type ElevationTokens } from '@kerno/tokens';

export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type ElevationInput = ElevationLevel | keyof ElevationTokens | number | string;

export interface ParsedShadowLayer {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

/** Clamps any number or string input to a valid `ElevationLevel` (`0..5`). */
export function normalizeElevation(value: ElevationInput | null | undefined): ElevationLevel {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? 0), 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 5) return 5;
  return n as ElevationLevel;
}

/** Returns the `var(--k-elevation-N)` reference for `level`. */
export function elevationToken(level: ElevationInput): string {
  const norm = normalizeElevation(level);
  return token(`elevation.${norm}` as const);
}

/** Returns the `--k-elevation-N` custom property name for `level`. */
export function elevationVarName(level: ElevationInput): string {
  const norm = normalizeElevation(level);
  return tokenName(`elevation.${norm}` as const);
}

/**
 * Splits a multi-layer `box-shadow` string on top-level commas (ignoring
 * commas inside `rgb(...)` / `rgba(...)` / `hsl(...)`).
 */
export function splitShadowLayers(boxShadow: string): string[] {
  const trimmed = boxShadow.trim();
  if (!trimmed || trimmed === 'none') return [];
  const layers: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) {
      const slice = trimmed.slice(start, i).trim();
      if (slice) layers.push(slice);
      start = i + 1;
    }
  }
  const tail = trimmed.slice(start).trim();
  if (tail) layers.push(tail);
  return layers;
}

/**
 * Parses a CSS `box-shadow` value into structured Canvas shadow parameters so
 * non-rectangular surfaces can draw shape-conforming outer shadows without
 * applying CSS `filter` to ancestors of `backdrop-filter`.
 */
export function parseShadowLayers(boxShadow: string): ParsedShadowLayer[] {
  const layers = splitShadowLayers(boxShadow);
  const parsed: ParsedShadowLayer[] = [];
  for (const raw of layers) {
    const cleaned = raw.replace(/\binset\b/gi, '').trim();
    const match = cleaned.match(
      /^(-?\d*\.?\d+)(?:px)?\s+(-?\d*\.?\d+)(?:px)?(?:\s+(-?\d*\.?\d+)(?:px)?)?(?:\s+(-?\d*\.?\d+)(?:px)?)?\s+(.+)$/,
    );
    if (!match) continue;
    const [, x, y, blur, _spread, color] = match;
    parsed.push({
      offsetX: Number.parseFloat(x!) || 0,
      offsetY: Number.parseFloat(y!) || 0,
      blur: blur ? Math.max(0, Number.parseFloat(blur) || 0) : 0,
      color: color!.trim(),
    });
  }
  return parsed;
}

/**
 * Reads the resolved `--k-elevation-N` token from `el` and parses its layers.
 */
export function resolveShadowLayers(el: Element, level: ElevationInput): ParsedShadowLayer[] {
  const norm = normalizeElevation(level);
  if (norm === 0 || typeof getComputedStyle === 'undefined') return [];
  const raw = getComputedStyle(el).getPropertyValue(elevationVarName(norm)).trim();
  return raw ? parseShadowLayers(raw) : [];
}

/**
 * Converts a CSS `box-shadow` value (single or comma-separated layers) into a
 * `filter: drop-shadow(...)` chain.
 */
export function boxShadowToDropShadow(boxShadow: string): string {
  const layers = splitShadowLayers(boxShadow);
  if (layers.length === 0) return 'none';
  return layers.map((layer) => `drop-shadow(${stripSpreadAndInset(layer)})`).join(' ');
}

function stripSpreadAndInset(layer: string): string {
  const withoutInset = layer.replace(/\binset\b/gi, '').trim();
  const match = withoutInset.match(
    /^(-?\d*\.?\d+(?:px|rem|em)?)\s+(-?\d*\.?\d+(?:px|rem|em)?)(?:\s+(-?\d*\.?\d+(?:px|rem|em)?))?(?:\s+(-?\d*\.?\d+(?:px|rem|em)?))?\s+(.+)$/,
  );
  if (!match) return withoutInset;
  const [, x, y, blur, _spread, color] = match;
  return blur ? `${x} ${y} ${blur} ${color}` : `${x} ${y} ${color}`;
}

/**
 * Reads the resolved `--k-elevation-N` token from `el` and returns the
 * corresponding `drop-shadow(...)` filter string.
 */
export function resolveDropShadowFilter(el: Element, level: ElevationInput): string {
  const norm = normalizeElevation(level);
  if (norm === 0 || typeof getComputedStyle === 'undefined') return 'none';
  const raw = getComputedStyle(el).getPropertyValue(elevationVarName(norm)).trim();
  return raw ? boxShadowToDropShadow(raw) : 'none';
}
