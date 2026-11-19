import type { Point } from './parametric-types.js';

export type Homography = [number, number, number, number, number, number, number, number, number];

export const IDENTITY: Homography = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export interface TiltParams {
  width: number;
  height: number;
  perspective: number;
  rotateX: number;
  rotateY: number;
  translateZ: number;
  originX?: number;
  originY?: number;
  scale?: number;
  x?: number;
  y?: number;
}

export type Matrix4 = number[];

export function multiplyMatrix(a: Matrix4, b: Matrix4): Matrix4 {
  const out = new Array<number>(16).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[r * 4 + k]! * b[k * 4 + c]!;
      out[r * 4 + c] = sum;
    }
  }
  return out;
}

function translate3d(x: number, y: number, z: number): Matrix4 {
  return [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
}

export function tiltMatrix(t: TiltParams): Matrix4 {
  const ax = (t.rotateX * Math.PI) / 180;
  const ay = (t.rotateY * Math.PI) / 180;
  const p = t.perspective > 0 && Number.isFinite(t.perspective) ? -1 / t.perspective : 0;
  const perspective = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, p, 1];
  const rx = [
    1,
    0,
    0,
    0,
    0,
    Math.cos(ax),
    -Math.sin(ax),
    0,
    0,
    Math.sin(ax),
    Math.cos(ax),
    0,
    0,
    0,
    0,
    1,
  ];
  const ry = [
    Math.cos(ay),
    0,
    Math.sin(ay),
    0,
    0,
    1,
    0,
    0,
    -Math.sin(ay),
    0,
    Math.cos(ay),
    0,
    0,
    0,
    0,
    1,
  ];
  const ox = t.originX === undefined ? t.width / 2 : t.originX;
  const oy = t.originY === undefined ? t.height / 2 : t.originY;
  const s = t.scale === undefined ? 1 : t.scale;
  const scale = [s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  let m = translate3d(ox + (t.x || 0), oy + (t.y || 0), 0);
  for (const step of [
    scale,
    perspective,
    rx,
    ry,
    translate3d(0, 0, t.translateZ),
    translate3d(-ox, -oy, 0),
  ]) {
    m = multiplyMatrix(m, step);
  }
  return m;
}

export function planeHomography(m: Matrix4): Homography {
  return [m[0]!, m[1]!, m[3]!, m[4]!, m[5]!, m[7]!, m[12]!, m[13]!, m[15]!];
}

export function tiltHomography(t: TiltParams): Homography {
  return planeHomography(tiltMatrix(t));
}

export function applyHomography(h: Homography, p: Point): Point {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}

export function invertHomography(h: Homography): Homography {
  const [a, b, c, d, e, f, g, i, j] = h;
  const A = e * j - f * i;
  const B = -(d * j - f * g);
  const C = d * i - e * g;
  const det = a * A + b * B + c * C;
  const k = 1 / det;
  return [
    A * k,
    -(b * j - c * i) * k,
    (b * f - c * e) * k,
    B * k,
    (a * j - c * g) * k,
    -(a * f - c * d) * k,
    C * k,
    -(a * i - b * g) * k,
    (a * e - b * d) * k,
  ];
}

export function scaleAt(h: Homography, p: Point): number {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  const u = h[0] * p.x + h[1] * p.y + h[2];
  const v = h[3] * p.x + h[4] * p.y + h[5];
  const dXdx = (h[0] * w - u * h[6]) / (w * w);
  const dXdy = (h[1] * w - u * h[7]) / (w * w);
  const dYdx = (h[3] * w - v * h[6]) / (w * w);
  const dYdy = (h[4] * w - v * h[7]) / (w * w);
  return Math.sqrt(Math.abs(dXdx * dYdy - dXdy * dYdx));
}

export function isIdentity(h: Homography): boolean {
  for (let i = 0; i < 9; i++) {
    if (Math.abs(h[i]! - IDENTITY[i]!) > 1e-12) return false;
  }
  return true;
}
