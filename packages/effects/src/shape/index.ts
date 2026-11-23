/**
 * Shape geometry engine.
 *
 * Unifies the four corner families (`rounded`, `chamfer`, `scallop`, `notch`)
 * with the full `@ax-design/shape` parametric contour solver (corner shoulder
 * fillets, corner shifts, side edge features `flat | arc | rect | triangle |
 * trapezoid | cusp`, geometric `borderInner` rings, and 3D homography).
 */
import { isServer } from '@kerno/core';
import { contourToSvgPath, traceContour } from './emit.js';
import type {
  EdgeKind,
  EdgeSpec,
  ParametricCornerShape,
  ParametricCornerSpec,
  ParametricShapeSpec,
  Quad,
} from './parametric-types.js';
import { resolveShape } from './resolve.js';

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

const EDGE_KINDS: readonly EdgeKind[] = [
  'flat',
  'arc',
  'rect',
  'triangle',
  'trapezoid',
  'cusp',
] as const;

export function isEdgeKind(value: unknown): value is EdgeKind {
  return typeof value === 'string' && (EDGE_KINDS as readonly string[]).includes(value);
}

export interface CornerSpec {
  readonly kind: CornerKind;
  readonly radius: number;
  readonly shiftX?: number;
  readonly shiftY?: number;
  readonly shoulderRadius?: number;
}

export interface ShapeSpec {
  readonly topLeft: CornerSpec;
  readonly topRight: CornerSpec;
  readonly bottomRight: CornerSpec;
  readonly bottomLeft: CornerSpec;
  readonly edges?: Quad<EdgeSpec>;
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
  shoulderRadius?: number;
  topLeft?: Partial<CornerSpec>;
  topRight?: Partial<CornerSpec>;
  bottomRight?: Partial<CornerSpec>;
  bottomLeft?: Partial<CornerSpec>;
  edges?: Partial<Record<'top' | 'right' | 'bottom' | 'left', Partial<EdgeSpec>>> | Quad<EdgeSpec>;
}

const FLAT_EDGE: EdgeSpec = {
  kind: 'flat',
  depth: 0,
  span: 0,
  at: 0.5,
  ratio: 0.5,
  tipRadius: 0,
  shoulderRadius: 0,
};

function normalizeEdge(input?: Partial<EdgeSpec>): EdgeSpec {
  if (!input || !input.kind || input.kind === 'flat') return FLAT_EDGE;
  return {
    kind: isEdgeKind(input.kind) ? input.kind : 'flat',
    depth: Number(input.depth) || 0,
    span: Math.max(0, Number(input.span) || 0),
    at: input.at !== undefined ? Math.min(1, Math.max(0, Number(input.at))) : 0.5,
    ratio: input.ratio !== undefined ? Math.min(1, Math.max(0, Number(input.ratio))) : 0.5,
    tipRadius: Math.max(0, Number(input.tipRadius) || 0),
    shoulderRadius: Math.max(0, Number(input.shoulderRadius) || 0),
  };
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
  const baseShoulder = Math.max(0, src.shoulderRadius ?? 0);

  let edges: Quad<EdgeSpec> | undefined;
  if (src.edges) {
    if (Array.isArray(src.edges)) {
      edges = [
        normalizeEdge(src.edges[0]),
        normalizeEdge(src.edges[1]),
        normalizeEdge(src.edges[2]),
        normalizeEdge(src.edges[3]),
      ];
    } else {
      const e = src.edges as Partial<
        Record<'top' | 'right' | 'bottom' | 'left', Partial<EdgeSpec>>
      >;
      edges = [
        normalizeEdge(e.top),
        normalizeEdge(e.right),
        normalizeEdge(e.bottom),
        normalizeEdge(e.left),
      ];
    }
  }

  const makeCorner = (
    c: Partial<CornerSpec> | undefined,
    fallbackKind: CornerKind,
    fallbackRadius: number,
  ): CornerSpec => {
    const shiftX = c?.shiftX ?? 0;
    const shiftY = c?.shiftY ?? 0;
    const shoulderRadius = c?.shoulderRadius ?? baseShoulder;
    return {
      kind: c?.kind ?? fallbackKind,
      radius: Math.max(0, c?.radius ?? fallbackRadius),
      ...(shiftX !== 0 ? { shiftX } : {}),
      ...(shiftY !== 0 ? { shiftY } : {}),
      ...(shoulderRadius > 0 ? { shoulderRadius } : {}),
    };
  };

  return {
    topLeft: makeCorner(src.topLeft, kinds[0], radii[0]),
    topRight: makeCorner(src.topRight, kinds[1], radii[1]),
    bottomRight: makeCorner(src.bottomRight, kinds[2], radii[2]),
    bottomLeft: makeCorner(src.bottomLeft, kinds[3], radii[3]),
    ...(edges ? { edges } : {}),
  };
}

function hasParametricFeatures(s: ShapeSpec): boolean {
  const corners = [s.topLeft, s.topRight, s.bottomRight, s.bottomLeft];
  for (const c of corners) {
    if ((c.shiftX && c.shiftX !== 0) || (c.shiftY && c.shiftY !== 0)) return true;
    if (c.shoulderRadius && c.shoulderRadius > 0 && c.kind !== 'rounded') return true;
  }
  if (s.edges) {
    for (const e of s.edges) {
      if (e.kind !== 'flat' && e.depth !== 0 && e.span > 0) return true;
    }
  }
  return false;
}

/**
 * True when every corner with `radius > 0` uses standard `'rounded'` geometry
 * and no parametric corner shifts or edge features are active.
 */
export function isRoundedOnly(input: ShapeInput | ShapeSpec): boolean {
  const s = normalizeShape(input);
  if (hasParametricFeatures(s)) return false;
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
    topLeft: { ...s.topLeft, radius: tl * scale },
    topRight: { ...s.topRight, radius: tr * scale },
    bottomRight: { ...s.bottomRight, radius: br * scale },
    bottomLeft: { ...s.bottomLeft, radius: bl * scale },
    ...(s.edges ? { edges: s.edges } : {}),
  };
}

function toParametricCornerShape(kind: CornerKind): ParametricCornerShape {
  switch (kind) {
    case 'rounded':
      return 'round';
    case 'chamfer':
      return 'bevel';
    case 'scallop':
      return 'scoop';
    case 'notch':
      return 'notch';
  }
}

export function toParametricSpec(
  width: number,
  height: number,
  input: ShapeInput | ShapeSpec,
  inset = 0,
): ParametricShapeSpec {
  const s = clampRadii(width, height, input, inset);
  const w = Math.max(0, width - inset * 2);
  const h = Math.max(0, height - inset * 2);
  const mapCorner = (c: CornerSpec): ParametricCornerSpec => ({
    radius: c.radius,
    shape: toParametricCornerShape(c.kind),
    shiftX: c.shiftX ?? 0,
    shiftY: c.shiftY ?? 0,
    shoulderRadius: c.shoulderRadius ?? 0,
  });
  return {
    width: w,
    height: h,
    corners: [
      mapCorner(s.topLeft),
      mapCorner(s.topRight),
      mapCorner(s.bottomRight),
      mapCorner(s.bottomLeft),
    ],
    edges: s.edges ?? [FLAT_EDGE, FLAT_EDGE, FLAT_EDGE, FLAT_EDGE],
  };
}

function parseLengthOrPct(raw: string, basis: number, fallback = 0): number {
  const t = raw.trim();
  if (!t || t === 'auto') return fallback;
  if (t.endsWith('%')) {
    const p = Number.parseFloat(t);
    return Number.isFinite(p) ? (p / 100) * basis : fallback;
  }
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Reads optional `--k-corner-*` and `--k-edge-*` CSS custom properties from
 * `el` and merges them onto `baseShape` (supporting full `@ax-design/shape`
 * edge features, corner shoulder radii, and corner shifts).
 */
export function readElementShapeCss(
  el: Element,
  width: number,
  height: number,
  baseShape: ShapeInput | ShapeSpec,
): ShapeSpec {
  const base = normalizeShape(baseShape);
  if (isServer || typeof getComputedStyle === 'undefined') return base;
  const style = getComputedStyle(el);
  const get = (name: string): string => style.getPropertyValue(name).trim();

  const genCornerShoulder = parseLengthOrPct(get('--k-corner-shoulder-radius'), 0, 0);
  const cornerNames = ['top-left', 'top-right', 'bottom-right', 'bottom-left'] as const;
  const cornerBase = [base.topLeft, base.topRight, base.bottomRight, base.bottomLeft] as const;

  const corners = cornerNames.map((name, i) => {
    const c = cornerBase[i]!;
    const shRaw = get(`--k-corner-${name}-shoulder-radius`);
    const shoulderRadius =
      shRaw && shRaw !== 'auto'
        ? parseLengthOrPct(shRaw, 0, c.shoulderRadius ?? genCornerShoulder)
        : c.shoulderRadius || genCornerShoulder;
    const shiftX = parseLengthOrPct(get(`--k-corner-${name}-shift-x`), width, c.shiftX ?? 0);
    const shiftY = parseLengthOrPct(get(`--k-corner-${name}-shift-y`), height, c.shiftY ?? 0);
    return { ...c, shoulderRadius, shiftX, shiftY };
  });

  const genKindRaw = get('--k-edge-kind');
  const genKind: EdgeKind = isEdgeKind(genKindRaw) ? genKindRaw : 'flat';
  const genDepth = parseLengthOrPct(get('--k-edge-depth'), 0, 0);
  const genSpanRaw = get('--k-edge-span') || '33%';
  const genAtRaw = get('--k-edge-at') || '50%';
  const genRatioRaw = get('--k-edge-ratio');
  const genRatio = genRatioRaw ? Number.parseFloat(genRatioRaw) : 0.5;
  const genTip = parseLengthOrPct(get('--k-edge-tip-radius'), 0, 0);
  const genShoulder = parseLengthOrPct(get('--k-edge-shoulder-radius'), 0, 0);

  const sideNames = ['top', 'right', 'bottom', 'left'] as const;
  let hasAnyEdge = genKind !== 'flat' || Boolean(base.edges);
  const edges = sideNames.map((side, i) => {
    const len = i % 2 === 0 ? width : height;
    const prevEdge = base.edges?.[i];
    const kindRaw = get(`--k-edge-${side}-kind`);
    const kind: EdgeKind =
      kindRaw && kindRaw !== 'auto' && isEdgeKind(kindRaw)
        ? kindRaw
        : prevEdge?.kind && prevEdge.kind !== 'flat'
          ? prevEdge.kind
          : genKind;
    if (kind !== 'flat') hasAnyEdge = true;

    const depthRaw = get(`--k-edge-${side}-depth`);
    const depth =
      depthRaw && depthRaw !== 'auto'
        ? parseLengthOrPct(depthRaw, len, prevEdge?.depth ?? genDepth)
        : (prevEdge?.depth ?? genDepth);

    const spanRaw = get(`--k-edge-${side}-span`);
    const span =
      spanRaw && spanRaw !== 'auto'
        ? parseLengthOrPct(spanRaw, len, prevEdge?.span ?? parseLengthOrPct(genSpanRaw, len, 0))
        : prevEdge?.span || parseLengthOrPct(genSpanRaw, len, 0);

    const atRaw = get(`--k-edge-${side}-at`);
    const atVal =
      atRaw && atRaw !== 'auto'
        ? parseLengthOrPct(atRaw, 1, prevEdge?.at ?? parseLengthOrPct(genAtRaw, 1, 0.5))
        : (prevEdge?.at ?? parseLengthOrPct(genAtRaw, 1, 0.5));

    const ratioRaw = get(`--k-edge-${side}-ratio`);
    const ratio =
      ratioRaw && ratioRaw !== 'auto' && Number.isFinite(Number.parseFloat(ratioRaw))
        ? Number.parseFloat(ratioRaw)
        : (prevEdge?.ratio ?? (Number.isFinite(genRatio) ? genRatio : 0.5));

    const tipRaw = get(`--k-edge-${side}-tip-radius`);
    const tipRadius =
      tipRaw && tipRaw !== 'auto'
        ? parseLengthOrPct(tipRaw, len, prevEdge?.tipRadius ?? genTip)
        : (prevEdge?.tipRadius ?? genTip);

    const shRaw = get(`--k-edge-${side}-shoulder-radius`);
    const shoulderRadius =
      shRaw && shRaw !== 'auto'
        ? parseLengthOrPct(shRaw, len, prevEdge?.shoulderRadius ?? genShoulder)
        : (prevEdge?.shoulderRadius ?? genShoulder);

    return normalizeEdge({ kind, depth, span, at: atVal, ratio, tipRadius, shoulderRadius });
  }) as Quad<EdgeSpec>;

  return {
    topLeft: corners[0]!,
    topRight: corners[1]!,
    bottomRight: corners[2]!,
    bottomLeft: corners[3]!,
    ...(hasAnyEdge ? { edges } : {}),
  };
}

const fmt = (n: number): string => {
  const rounded = Math.round(n * 100) / 100;
  return Object.is(rounded, -0) ? '0' : String(rounded);
};

function offsetContour(width: number, height: number, spec: ShapeSpec, inset: number) {
  const pSpec = toParametricSpec(width, height, spec, inset);
  const resolved = resolveShape(pSpec);
  if (inset === 0) return resolved.outline;
  return {
    segments: resolved.outline.segments.map((s) =>
      s.type === 'line'
        ? { ...s, x0: s.x0 + inset, y0: s.y0 + inset, x1: s.x1 + inset, y1: s.y1 + inset }
        : {
            ...s,
            cx: s.cx + inset,
            cy: s.cy + inset,
            x0: s.x0 + inset,
            y0: s.y0 + inset,
            x1: s.x1 + inset,
            y1: s.y1 + inset,
          },
    ),
  };
}

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

  const normalized = normalizeShape(input);
  if (hasParametricFeatures(normalized)) {
    return contourToSvgPath(offsetContour(w, h, normalized, inset), 2);
  }

  const spec = clampRadii(w, h, normalized, inset);
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;

  const tl = spec.topLeft;
  const tr = spec.topRight;
  const br = spec.bottomRight;
  const bl = spec.bottomLeft;

  const cmds: string[] = [`M ${fmt(x0 + tl.radius)} ${fmt(y0)}`];

  cmds.push(`L ${fmt(x1 - tr.radius)} ${fmt(y0)}`);
  if (tr.radius > 0) {
    cmds.push(
      cornerSvgCommand(tr.kind, tr.radius, x1, y0 + tr.radius, x1 - tr.radius, y0 + tr.radius),
    );
  }

  cmds.push(`L ${fmt(x1)} ${fmt(y1 - br.radius)}`);
  if (br.radius > 0) {
    cmds.push(
      cornerSvgCommand(br.kind, br.radius, x1 - br.radius, y1, x1 - br.radius, y1 - br.radius),
    );
  }

  cmds.push(`L ${fmt(x0 + bl.radius)} ${fmt(y1)}`);
  if (bl.radius > 0) {
    cmds.push(
      cornerSvgCommand(bl.kind, bl.radius, x0, y1 - bl.radius, x0 + bl.radius, y1 - bl.radius),
    );
  }

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
 * Generates a CSS `mask-image: url("data:image/svg+xml,...")` value for
 * `(width × height)`. Used on Chromium to clip `backdrop-filter` layers to
 * non-rectangular outlines.
 */
export function toMaskImage(
  width: number,
  height: number,
  input: ShapeInput | ShapeSpec,
  inset = 0,
  paintBox?: { left: number; top: number; width: number; height: number },
): string {
  const d = toSvgPath(width, height, input, inset);
  if (!d) return '';
  const bx = fmt(paintBox ? paintBox.left : 0);
  const by = fmt(paintBox ? paintBox.top : 0);
  const bw = fmt(Math.max(0, paintBox ? paintBox.width : width));
  const bh = fmt(Math.max(0, paintBox ? paintBox.height : height));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}" viewBox="${bx} ${by} ${bw} ${bh}"><path d="${d}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
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

  const normalized = normalizeShape(input);
  if (hasParametricFeatures(normalized)) {
    traceContour(target, offsetContour(w, h, normalized, inset));
    return;
  }

  const spec = clampRadii(w, h, normalized, inset);
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

export {
  borderInner,
  innerToSvgPath,
  projectContour,
  traceInner,
  type BorderOptions,
  type BorderResult,
  type RingSink,
} from './border.js';
export { contourToSvgPath, formatNumber, traceContour, type PathSink } from './emit.js';
export {
  IDENTITY,
  applyHomography,
  invertHomography,
  isIdentity,
  multiplyMatrix,
  planeHomography,
  scaleAt,
  tiltHomography,
  tiltMatrix,
  type Homography,
  type Matrix4,
  type TiltParams,
} from './homography.js';
export { ShapeOutlineController, type ShapeOutlineConfig } from './outline.js';
export { LazyShapeOutlineController, loadShapeOutline } from './lazy.js';
export type {
  ArcSegment,
  Clamp,
  ClampKind,
  Contour,
  EdgeKind,
  EdgeSpec,
  LineSegment,
  ParametricCornerShape,
  ParametricCornerSpec,
  ParametricShapeSpec,
  Point,
  Quad,
  ResolvedShape,
  Segment,
  Vertex,
} from './parametric-types.js';
export { resolveShape, signedArea, type ResolveOptions } from './resolve.js';
