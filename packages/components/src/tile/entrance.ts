import { bezierAt, parseEasing, type CubicBezierTuple } from '@kerno/effects';

export type EntranceVariant = 'desktop' | 'mobile';

export interface Params {
  enterOffset: number | null;
  enterSpread: number;
  enterDuration: number;
  enterEasing: CubicBezierTuple;
  enterScale: number;
  enterScaleDuration: number;
  enterScaleEasing: CubicBezierTuple;
  enterFade: number;
  enterBand: number | null;
  enterStagger: number;
  enterDelay: number;
  exitDuration: number;
  turnstilePerspective: number;
  turnstileOrigin: number;
  turnstileDuration: number;
  turnstileEasing: CubicBezierTuple;
  launchScale: number;
  launchDuration: number;
}

export interface EntranceFrame {
  dx: number;
  scale: number;
  rotateY: number;
  enter: number;
}

const DESKTOP_EASING: CubicBezierTuple = [0.17, 0.55, 0.3, 0.95];
const DESKTOP_SCALE_EASING: CubicBezierTuple = [0.1, 0.9, 0.2, 1];
const TURNSTILE_EASING: CubicBezierTuple = [0.22, 1, 0.36, 1];

export function readParams(style: CSSStyleDeclaration): Params {
  const value = (kernoName: string, axName: string): string =>
    style.getPropertyValue(kernoName).trim() || style.getPropertyValue(axName).trim();

  return {
    enterOffset: parseLengthOr(value('--k-tile-enter-offset', '--tile-enter-offset'), null),
    enterSpread: parseNumber(value('--k-tile-enter-spread', '--tile-enter-spread'), 0.93),
    enterDuration: parseTime(value('--k-tile-enter-duration', '--tile-enter-duration'), 530),
    enterEasing: parseEasing(value('--k-tile-enter-easing', '--tile-enter-easing'), DESKTOP_EASING),
    enterScale: parseNumber(value('--k-tile-enter-scale', '--tile-enter-scale'), 0.8),
    enterScaleDuration: parseTime(
      value('--k-tile-enter-scale-duration', '--tile-enter-scale-duration'),
      450,
    ),
    enterScaleEasing: parseEasing(
      value('--k-tile-enter-scale-easing', '--tile-enter-scale-easing'),
      DESKTOP_SCALE_EASING,
    ),
    enterFade: parseTime(value('--k-tile-enter-fade', '--tile-enter-fade'), 133),
    enterBand: parseBand(value('--k-tile-enter-band', '--tile-enter-band')),
    enterStagger: parseTime(value('--k-tile-enter-stagger', '--tile-enter-stagger'), 35),
    enterDelay: parseTime(value('--k-tile-enter-delay', '--tile-enter-delay'), 0),
    exitDuration: parseTime(value('--k-tile-exit-duration', '--tile-exit-duration'), 200),
    turnstilePerspective: parseLengthOr(
      value('--k-tile-turnstile-perspective', '--tile-turnstile-perspective'),
      1000,
    ),
    turnstileOrigin: parseLengthOr(
      value('--k-tile-turnstile-origin', '--tile-turnstile-origin'),
      0,
    ),
    turnstileDuration: parseTime(
      value('--k-tile-turnstile-duration', '--tile-turnstile-duration'),
      600,
    ),
    turnstileEasing: parseEasing(
      value('--k-tile-turnstile-easing', '--tile-turnstile-easing'),
      TURNSTILE_EASING,
    ),
    launchScale: parseNumber(value('--k-tile-launch-exit-scale', '--tile-launch-exit-scale'), 0.9),
    launchDuration: parseTime(
      value('--k-tile-launch-exit-duration', '--tile-launch-exit-duration'),
      100,
    ),
  };
}

function parseTime(text: string, fallback: number): number {
  const m = /^(\d*\.?\d+)(ms|s)$/i.exec(text);
  return m ? Number.parseFloat(m[1]!) * (m[2]!.toLowerCase() === 's' ? 1000 : 1) : fallback;
}

export function parsePxLength(text: string): number | null {
  const t = text.trim();
  if (t === '0') return 0;
  const m = /^([+-]?\d*\.?\d+)px$/i.exec(t);
  return m ? Number.parseFloat(m[1]!) : null;
}

function parseLengthOr<T>(text: string, fallback: T): number | T {
  const px = parsePxLength(text);
  return px === null || !Number.isFinite(px) ? fallback : px;
}

function parseBand(text: string): number | null {
  const n = parseNumber(text, NaN);
  return n >= 1 ? Math.round(n) : null;
}

function parseNumber(text: string, fallback: number): number {
  return /^[+-]?(\d*\.?\d+)(e[+-]?\d+)?$/i.test(text) ? Number.parseFloat(text) : fallback;
}

export function parseVariant(attribute: string | null): EntranceVariant | null {
  return attribute === 'desktop' || attribute === 'mobile' ? attribute : null;
}

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function progress(t: number, duration: number): number {
  return duration > 0 ? clamp01(t / duration) : 1;
}

export function enterDesktop(t: number, delay: number, shift: number, p: Params): EntranceFrame {
  const move = bezierAt(p.enterEasing, progress(t - delay, p.enterDuration));
  const grow = bezierAt(p.enterScaleEasing, progress(t - delay, p.enterScaleDuration));
  return {
    dx: shift * (1 - move),
    scale: p.enterScale + (1 - p.enterScale) * grow,
    rotateY: 0,
    enter: progress(t - delay, p.enterFade),
  };
}

export function bandShift(middle: number, center: number, size: number, p: Params): number {
  const offset = p.enterOffset === null ? size * 0.01 : p.enterOffset;
  return (1 - p.enterSpread) * (center - middle) + offset;
}

export function enterLength(p: Params): number {
  return Math.max(p.enterDuration, p.enterScaleDuration, p.enterFade);
}

export function exitDesktop(t: number, p: Params): EntranceFrame {
  return { dx: 0, scale: 1, rotateY: 0, enter: 1 - progress(t, p.exitDuration) };
}

export function turnstileOrigin(
  left: number,
  top: number,
  origin: number,
  viewportHeight: number,
): { x: number; y: number } {
  return { x: -(origin + left), y: viewportHeight / 2 - top };
}

export function turnstile(
  fraction: number,
  begin: number,
  entering: boolean,
  p: Params,
): EntranceFrame {
  const e = bezierAt(p.turnstileEasing, clamp01((fraction - begin) / (1 - begin)));
  return entering
    ? { dx: 0, scale: 1, rotateY: 90 * (1 - e), enter: e }
    : { dx: 0, scale: 1, rotateY: 90 * e, enter: 1 - e };
}

export function turnstileBegin(x: number, y: number, entering: boolean, random: number): number {
  const k = entering ? 0.00047 : -0.00047;
  return Math.min(0.9, Math.max(0, y * 0.001714 + x * k + random * 0.1));
}
