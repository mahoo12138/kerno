/**
 * Shape geometry engine.
 *
 * Generates unified paths for four corner families (`rounded`, `chamfer`,
 * `scallop`, `notch`) across both CSS (`clip-path: path(...)`, SVG `<path>`)
 * and Canvas 2D (`Path2D` / `CanvasRenderingContext2D`).
 */

export type CornerKind = 'rounded' | 'chamfer' | 'scallop' | 'notch';

export const CORNER_KINDS: readonly CornerKind[] = [
  'rounded',
  'chamfer',
  'scallop',
  'notch',
] as const;

export function isCornerKind(value: unknown): value is CornerKind {
  return typeof value === 'string' && (CORNER_KINDS as readonly string[]).includes(value);
}

export interface CornerSpec {
  readonly kind: CornerKind;
  readonly radius: number;
}

export interface ShapeSpec {
  readonly topLeft: CornerSpec;
  readonly topRight: CornerSpec;
  readonly bottomRight: CornerSpec;
  readonly bottomLeft: CornerSpec;
}

export type CornerTuple<T> = readonly [topLeft: T, topRight: T, bottomRight: T, bottomLeft: T];

export interface ShapeInput {
  /** Uniform corner kind, or `[topLeft, topRight, bottomRight, bottomLeft]`. */
  kind?: CornerKind | CornerTuple<CornerKind>;
  /**
   * Corner radius in CSS pixels: a single number, a CSS shorthand string of
   * 1–4 numbers (e.g. `"8"` or `"12 4"`), or a 4-tuple.
   */
  radius?: number | string | CornerTuple<number>;
  topLeft?: Partial<CornerSpec>;
  topRight?: Partial<CornerSpec>;
  bottomRight?: Partial<CornerSpec>;
  bottomLeft?: Partial<CornerSpec>;
}

/**
 * Parses a numeric or CSS-shorthand radius (`"8"`, `"8px"`, `"12 4"`,
 * `"12 8 4 0"`) into `[topLeft, topRight, bottomRight, bottomLeft]`.
 */
export function parseRadius(
  input: number | string | CornerTuple<number> | undefined,
  fallback = 0,
): CornerTuple<number> {
  if (typeof input === 'number') {
    const r = Number.isFinite(input) ? Math.max(0, input) : fallback;
    return [r, r, r, r];
  }
  if (Array.isArray(input)) {
    return [
      Math.max(0, Number(input[0]) || 0),
      Math.max(0, Number(input[1]) || 0),
      Math.max(0, Number(input[2]) || 0),
      Math.max(0, Number(input[3]) || 0),
    ];
  }
  if (typeof input === 'string') {
    const parts = input
      .trim()
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map((s) => Math.max(0, Number.parseFloat(s) || 0));
    if (parts.length === 1) return [parts[0]!, parts[0]!, parts[0]!, parts[0]!];
    if (parts.length === 2) return [parts[0]!, parts[1]!, parts[0]!, parts[1]!];
    if (parts.length === 3) return [parts[0]!, parts[1]!, parts[2]!, parts[1]!];
    if (parts.length >= 4) return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
  }
  const r = Math.max(0, fallback);
  return [r, r, r, r];
}

/** Resolves any `ShapeInput` or `ShapeSpec` into a normalized 4-corner `ShapeSpec`. */
export function normalizeShape(input: ShapeInput | ShapeSpec = {}): ShapeSpec {
  if (
    'topLeft' in input &&
    'topRight' in input &&
    'bottomRight' in input &&
    'bottomLeft' in input
  ) {
    const full = input as ShapeSpec;
    if (
      full.topLeft &&
      typeof full.topLeft.kind === 'string' &&
      typeof full.topLeft.radius === 'number' &&
      !('kind' in input) &&
      !('radius' in input)
    ) {
      return full;
    }
  }
  const src = input as ShapeInput;
  const kinds: CornerTuple<CornerKind> =
    typeof src.kind === 'string' || src.kind === undefined
      ? [src.kind ?? 'rounded', src.kind ?? 'rounded', src.kind ?? 'rounded', src.kind ?? 'rounded']
      : src.kind;
  const radii = parseRadius(src.radius, 0);

  return {
    topLeft: {
      kind: src.topLeft?.kind ?? kinds[0],
      radius: Math.max(0, src.topLeft?.radius ?? radii[0]),
    },
    topRight: {
      kind: src.topRight?.kind ?? kinds[1],
      radius: Math.max(0, src.topRight?.radius ?? radii[1]),
    },
    bottomRight: {
      kind: src.bottomRight?.kind ?? kinds[2],
      radius: Math.max(0, src.bottomRight?.radius ?? radii[2]),
    },
    bottomLeft: {
      kind: src.bottomLeft?.kind ?? kinds[3],
      radius: Math.max(0, src.bottomLeft?.radius ?? radii[3]),
    },
  };
}

/**
 * True when every corner with `radius > 0` uses standard `'rounded'` geometry
 * (meaning native CSS `border-radius` & `box-shadow` suffice).
 */
export function isRoundedOnly(input: ShapeInput | ShapeSpec): boolean {
  const s = normalizeShape(input);
  return (
    (s.topLeft.radius === 0 || s.topLeft.kind === 'rounded') &&
    (s.topRight.radius === 0 || s.topRight.kind === 'rounded') &&
    (s.bottomRight.radius === 0 || s.bottomRight.kind === 'rounded') &&
    (s.bottomLeft.radius === 0 || s.bottomLeft.kind === 'rounded')
  );
}

const CHAMFER_INSET_FACTOR = 2 - Math.SQRT2;

function insetCornerRadius(corner: CornerSpec, inset: number): number {
  if (corner.radius <= 0) return 0;
  if (inset <= 0) return corner.radius;
  switch (corner.kind) {
    case 'rounded':
      return Math.max(0, corner.radius - inset);
    case 'chamfer':
      return Math.max(0, corner.radius - inset * CHAMFER_INSET_FACTOR);
    case 'scallop':
    case 'notch':
      return corner.radius;
  }
}

/**
 * Clamps the four corner radii using the CSS Backgrounds & Borders Level 3
 * proportional reduction algorithm so adjacent corners never overlap.
 */
export function clampRadii(
  width: number,
  height: number,
  input: ShapeInput | ShapeSpec,
  inset = 0,
): ShapeSpec {
  const s = normalizeShape(input);
  const w = Math.max(0, width - inset * 2);
  const h = Math.max(0, height - inset * 2);

  const tl = insetCornerRadius(s.topLeft, inset);
  const tr = insetCornerRadius(s.topRight, inset);
  const br = insetCornerRadius(s.bottomRight, inset);
  const bl = insetCornerRadius(s.bottomLeft, inset);

  const scale = Math.min(
    1,
    tl + tr > 0 ? w / (tl + tr) : 1,
    bl + br > 0 ? w / (bl + br) : 1,
    tl + bl > 0 ? h / (tl + bl) : 1,
    tr + br > 0 ? h / (tr + br) : 1,
  );

  return {
    topLeft: { kind: s.topLeft.kind, radius: tl * scale },
    topRight: { kind: s.topRight.kind, radius: tr * scale },
    bottomRight: { kind: s.bottomRight.kind, radius: br * scale },
    bottomLeft: { kind: s.bottomLeft.kind, radius: bl * scale },
  };
}

const fmt = (n: number): string => {
  const rounded = Math.round(n * 100) / 100;
  return Object.is(rounded, -0) ? '0' : String(rounded);
};

/**
 * Generates an SVG path data string (`M ... Z`) for a shape of `(width × height)`
 * with an optional inward `inset` (e.g. `strokeWidth / 2`).
 */
export function toSvgPath(
  width: number,
  height: number,
  input: ShapeInput | ShapeSpec,
  inset = 0,
): string {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  if (w <= inset * 2 || h <= inset * 2) return '';

  const spec = clampRadii(w, h, input, inset);
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;

  const tl = spec.topLeft;
  const tr = spec.topRight;
  const br = spec.bottomRight;
  const bl = spec.bottomLeft;

  const cmds: string[] = [`M ${fmt(x0 + tl.radius)} ${fmt(y0)}`];

  // Top edge -> Top-Right corner
  cmds.push(`L ${fmt(x1 - tr.radius)} ${fmt(y0)}`);
  if (tr.radius > 0) {
    cmds.push(
      cornerSvgCommand(tr.kind, tr.radius, x1, y0 + tr.radius, x1 - tr.radius, y0 + tr.radius),
    );
  }

  // Right edge -> Bottom-Right corner
  cmds.push(`L ${fmt(x1)} ${fmt(y1 - br.radius)}`);
  if (br.radius > 0) {
    cmds.push(
      cornerSvgCommand(br.kind, br.radius, x1 - br.radius, y1, x1 - br.radius, y1 - br.radius),
    );
  }

  // Bottom edge -> Bottom-Left corner
  cmds.push(`L ${fmt(x0 + bl.radius)} ${fmt(y1)}`);
  if (bl.radius > 0) {
    cmds.push(
      cornerSvgCommand(bl.kind, bl.radius, x0, y1 - bl.radius, x0 + bl.radius, y1 - bl.radius),
    );
  }

  // Left edge -> Top-Left corner
  cmds.push(`L ${fmt(x0)} ${fmt(y0 + tl.radius)}`);
  if (tl.radius > 0) {
    cmds.push(
      cornerSvgCommand(tl.kind, tl.radius, x0 + tl.radius, y0, x0 + tl.radius, y0 + tl.radius),
    );
  }

  cmds.push('Z');
  return cmds.join(' ');
}

function cornerSvgCommand(
  kind: CornerKind,
  r: number,
  endX: number,
  endY: number,
  notchX: number,
  notchY: number,
): string {
  switch (kind) {
    case 'rounded':
      return `A ${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(endX)} ${fmt(endY)}`;
    case 'scallop':
      return `A ${fmt(r)} ${fmt(r)} 0 0 0 ${fmt(endX)} ${fmt(endY)}`;
    case 'chamfer':
      return `L ${fmt(endX)} ${fmt(endY)}`;
    case 'notch':
      return `L ${fmt(notchX)} ${fmt(notchY)} L ${fmt(endX)} ${fmt(endY)}`;
  }
}

/**
 * Generates a CSS `clip-path: path('...')` value for `(width × height)`.
 */
export function toClipPath(
  width: number,
  height: number,
  input: ShapeInput | ShapeSpec,
  inset = 0,
): string {
  const d = toSvgPath(width, height, input, inset);
  return d ? `path('${d}')` : 'none';
}

/**
 * Traces the shape onto a Canvas `CanvasPath` (`CanvasRenderingContext2D` or `Path2D`).
 */
export function traceCanvasPath(
  target: CanvasPath,
  width: number,
  height: number,
  input: ShapeInput | ShapeSpec,
  inset = 0,
): void {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  if (w <= inset * 2 || h <= inset * 2) return;

  const spec = clampRadii(w, h, input, inset);
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;

  const tl = spec.topLeft;
  const tr = spec.topRight;
  const br = spec.bottomRight;
  const bl = spec.bottomLeft;

  const HALF_PI = Math.PI / 2;

  target.moveTo(x0 + tl.radius, y0);

  // Top-Right corner (box corner at x1, y0)
  target.lineTo(x1 - tr.radius, y0);
  if (tr.radius > 0) {
    traceCorner(
      target,
      tr.kind,
      tr.radius,
      x1,
      y0,
      x1 - tr.radius,
      y0 + tr.radius,
      x1,
      y0 + tr.radius,
      -HALF_PI,
      0,
      Math.PI,
      HALF_PI,
    );
  }

  // Bottom-Right corner (box corner at x1, y1)
  target.lineTo(x1, y1 - br.radius);
  if (br.radius > 0) {
    traceCorner(
      target,
      br.kind,
      br.radius,
      x1,
      y1,
      x1 - br.radius,
      y1 - br.radius,
      x1 - br.radius,
      y1,
      0,
      HALF_PI,
      -HALF_PI,
      Math.PI,
    );
  }

  // Bottom-Left corner (box corner at x0, y1)
  target.lineTo(x0 + bl.radius, y1);
  if (bl.radius > 0) {
    traceCorner(
      target,
      bl.kind,
      bl.radius,
      x0,
      y1,
      x0 + bl.radius,
      y1 - bl.radius,
      x0,
      y1 - bl.radius,
      HALF_PI,
      Math.PI,
      0,
      -HALF_PI,
    );
  }

  // Top-Left corner (box corner at x0, y0)
  target.lineTo(x0, y0 + tl.radius);
  if (tl.radius > 0) {
    traceCorner(
      target,
      tl.kind,
      tl.radius,
      x0,
      y0,
      x0 + tl.radius,
      y0 + tl.radius,
      x0 + tl.radius,
      y0,
      Math.PI,
      -HALF_PI,
      HALF_PI,
      0,
    );
  }

  target.closePath();
}

function traceCorner(
  target: CanvasPath,
  kind: CornerKind,
  r: number,
  boxX: number,
  boxY: number,
  innerX: number,
  innerY: number,
  endX: number,
  endY: number,
  roundedStart: number,
  roundedEnd: number,
  scallopStart: number,
  scallopEnd: number,
): void {
  switch (kind) {
    case 'rounded':
      target.arc(innerX, innerY, r, roundedStart, roundedEnd, false);
      break;
    case 'scallop':
      target.arc(boxX, boxY, r, scallopStart, scallopEnd, true);
      break;
    case 'chamfer':
      target.lineTo(endX, endY);
      break;
    case 'notch':
      target.lineTo(innerX, innerY);
      target.lineTo(endX, endY);
      break;
  }
}

/** Creates a `Path2D` instance for `(width × height)`. */
export function createPath2D(
  width: number,
  height: number,
  input: ShapeInput | ShapeSpec,
  inset = 0,
): Path2D {
  const path = new Path2D();
  traceCanvasPath(path, width, height, input, inset);
  return path;
}
