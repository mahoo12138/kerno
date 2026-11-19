export type ParametricCornerShape = 'round' | 'bevel' | 'scoop' | 'notch';

export type EdgeKind = 'flat' | 'arc' | 'rect' | 'triangle' | 'trapezoid' | 'cusp';

/** 4-tuple in clockwise order: corners (`top-left, top-right, bottom-right, bottom-left`) or sides (`top, right, bottom, left`). */
export type Quad<T> = [T, T, T, T];

export interface ParametricCornerSpec {
  radius: number;
  shape: ParametricCornerShape;
  shiftX: number;
  shiftY: number;
  shoulderRadius?: number;
}

export interface EdgeSpec {
  kind: EdgeKind;
  /** Signed depth in px: positive extends outward, negative carves inward. */
  depth: number;
  /** Feature base width along the edge in px. */
  span: number;
  /** Center position along the edge as a fraction in `[0, 1]`. */
  at: number;
  /** Far-end width ratio in `[0, 1]` for `'trapezoid'`. */
  ratio: number;
  tipRadius: number;
  shoulderRadius: number;
}

export interface ParametricShapeSpec {
  width: number;
  height: number;
  corners: Quad<ParametricCornerSpec>;
  edges: Quad<EdgeSpec>;
}

export interface Point {
  x: number;
  y: number;
}

export interface Vertex extends Point {
  radius: number;
  side: number;
}

export interface LineSegment {
  type: 'line';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  side: number;
}

export interface ArcSegment {
  type: 'arc';
  cx: number;
  cy: number;
  r: number;
  start: number;
  end: number;
  anticlockwise: boolean;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  side: number;
  sideEnd: number;
}

export type Segment = LineSegment | ArcSegment;

export interface Contour {
  segments: Segment[];
}

export type ClampKind =
  'corner-shift' | 'corner-radius' | 'edge-span' | 'edge-depth' | 'vertex-radius';

export interface Clamp {
  kind: ClampKind;
  index: number;
  factor: number;
}

export interface ResolvedShape {
  outline: Contour;
  vertices: Vertex[];
  bounds: { left: number; top: number; right: number; bottom: number };
  clamps: Clamp[];
}
