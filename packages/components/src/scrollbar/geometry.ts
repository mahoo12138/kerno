/**
 * Pure scroll geometry, smoothing, marker placement, and chevron path helpers
 * adapted from `@ax-design/scrollbar`.
 */
import type { Placement } from './types.js';

/** Default exponential glide time constant in ms (buttons, track pages, markers). */
export const SMOOTH_TAU = 50;
/** Default exponential thumb/marker chase time constant in ms (~15% per 60Hz frame). */
export const FOLLOW_TAU = 100;
/** Distance threshold (px) below which a chased value snaps to its target. */
export const SETTLE = 0.01;

export interface AxisMetrics {
  client: number;
  size: number;
  position: number;
  track: number;
  minThumb: number;
}

export interface AxisLayout {
  scrollable: boolean;
  max: number;
  position: number;
  track: number;
  thumbLength: number;
  thumbOffset: number;
  travel: number;
  ratio: number;
}

export interface ShownThumb {
  offset: number;
  length: number;
}

export type GlyphDirection = 'up' | 'down' | 'left' | 'right';
export type GlyphShape = 'chevron' | 'triangle';

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

function offsetFor(position: number, max: number, travel: number): number {
  return max > 0 && travel > 0 ? (position / max) * travel : 0;
}

export function layoutAxis(m: AxisMetrics): AxisLayout {
  const max = Math.max(0, m.size - m.client);
  const scrollable = max > 0.5;
  const position = clamp(m.position, 0, max);
  let thumbLength: number;
  if (m.track <= 0) {
    thumbLength = 0;
  } else if (!scrollable) {
    thumbLength = m.track;
  } else {
    const proportional = (m.track * m.client) / Math.max(m.size, 1);
    thumbLength = clamp(proportional, Math.min(m.minThumb, m.track), m.track);
  }
  const travel = m.track - thumbLength;
  return {
    scrollable,
    max,
    position,
    track: m.track,
    thumbLength,
    thumbOffset: offsetFor(position, max, travel),
    travel,
    ratio: travel > 0 ? max / travel : 0,
  };
}

export function thumbOffsetAt(layout: AxisLayout, position: number): number {
  return offsetFor(clamp(position, 0, layout.max), layout.max, layout.travel);
}

export function layoutAt(layout: AxisLayout, position: number): AxisLayout {
  const at = clamp(position, 0, layout.max);
  return { ...layout, position: at, thumbOffset: thumbOffsetAt(layout, at) };
}

export function jumpTo(layout: AxisLayout, along: number): number {
  return clamp((along - layout.thumbLength / 2) * layout.ratio, 0, layout.max);
}

export function dragTo(layout: AxisLayout, startPosition: number, pointerDelta: number): number {
  return clamp(startPosition + pointerDelta * layout.ratio, 0, layout.max);
}

export function pageDirection(layout: AxisLayout, along: number): -1 | 0 | 1 {
  if (along < layout.thumbOffset) return -1;
  if (along >= layout.thumbOffset + layout.thumbLength) return 1;
  return 0;
}

/** Windows paging keeps one line of the previous viewport on screen. */
export function pageStep(client: number, line: number): number {
  return Math.max(line, client - line);
}

export function markerAnchor(
  contentPosition: number,
  client: number,
  max: number,
  align: number,
): number {
  return clamp(contentPosition - client * align, 0, max);
}

export function markerOffset(layout: AxisLayout, anchor: number, align: number): number {
  return thumbOffsetAt(layout, anchor) + layout.thumbLength * align;
}

export function physical(logical: number, length: number, track: number, rtl: boolean): number {
  return rtl ? track - logical - length : logical;
}

export function snap(value: number, origin: number, dpr: number): number {
  return Math.round((origin + value) * dpr) / dpr - origin;
}

export function snapLayout(layout: AxisLayout, origin: number, dpr: number): AxisLayout {
  const start = snap(layout.thumbOffset, origin, dpr);
  const end = snap(layout.thumbOffset + layout.thumbLength, origin, dpr);
  return { ...layout, thumbOffset: start, thumbLength: end - start };
}

/** Frame-rate-independent exponential approach from `from` toward `to`. */
export function chase(from: number, to: number, dt: number, tau: number): number {
  if (tau <= 0 || dt <= 0) return tau <= 0 ? to : from;
  return to - (to - from) * Math.exp(-dt / tau);
}

export function follow(from: number, to: number, dt: number, tau: number): number {
  if (tau <= 0) return to;
  const next = chase(from, to, dt, tau);
  return Math.abs(to - next) <= SETTLE ? to : next;
}

export function nextStep(
  from: number,
  goal: number,
  dt: number,
  tau: number,
): { at: number; done: boolean } {
  if (tau <= 0) return { at: goal, done: true };
  const at = chase(from, goal, dt, tau);
  if (Math.abs(goal - at) <= 0.5) return { at: goal, done: true };
  return { at, done: false };
}

export function followThumb(
  from: ShownThumb | null,
  offset: number,
  length: number,
  dt: number,
  tau: number,
): ShownThumb {
  if (!from) return { offset, length };
  return {
    offset: follow(from.offset, offset, dt, tau),
    length: follow(from.length, length, dt, tau),
  };
}

export function placeCard(
  point: { x: number; y: number },
  size: { width: number; height: number },
  placement: Placement,
  gap: number,
  viewport: { width: number; height: number },
  margin = 4,
): { left: number; top: number } {
  let left: number;
  let top: number;
  if (placement === 'left') {
    left = point.x - gap - size.width;
    top = point.y - size.height / 2;
  } else if (placement === 'right') {
    left = point.x + gap;
    top = point.y - size.height / 2;
  } else if (placement === 'above') {
    left = point.x - size.width / 2;
    top = point.y - gap - size.height;
  } else {
    left = point.x - size.width / 2;
    top = point.y + gap;
  }
  left = Math.max(margin, Math.min(left, viewport.width - margin - size.width));
  top = Math.max(margin, Math.min(top, viewport.height - margin - size.height));
  return { left: Math.round(left), top: Math.round(top) };
}

export function parseCssTimeMs(text: string, fallback: number): number {
  const match = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(ms|s)$/i.exec(text.trim());
  if (!match) return fallback;
  const value = Number.parseFloat(match[1]!);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, match[2]!.toLowerCase() === 's' ? value * 1000 : value);
}

export function parseCssLengthPx(text: string, fallback: number, reference = 0): number {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  if (trimmed.endsWith('%')) {
    const pct = Number.parseFloat(trimmed);
    return Number.isFinite(pct) ? Math.max(0, (pct / 100) * reference) : fallback;
  }
  const value = Number.parseFloat(trimmed);
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

/**
 * Generates an SVG path for a Windows 8 chevron or WinUI rounded triangle arrow
 * inside a `16 × 16` viewBox.
 */
export function buttonGlyphPath(direction: GlyphDirection, shape: GlyphShape = 'triangle'): string {
  if (shape === 'chevron') {
    switch (direction) {
      case 'up':
        return 'M8 4.4 L13.4 9.8 L13.4 12.1 L8 6.7 L2.6 12.1 L2.6 9.8 Z';
      case 'down':
        return 'M8 11.6 L13.4 6.2 L13.4 3.9 L8 9.3 L2.6 3.9 L2.6 6.2 Z';
      case 'left':
        return 'M4.4 8 L9.8 13.4 L12.1 13.4 L6.7 8 L12.1 2.6 L9.8 2.6 Z';
      case 'right':
        return 'M11.6 8 L6.2 13.4 L3.9 13.4 L9.3 8 L3.9 2.6 L6.2 2.6 Z';
    }
  }
  // WinUI Fluent rounded caret triangle
  switch (direction) {
    case 'up':
      return 'M7.3 5.2 Q8 4.4 8.7 5.2 L12.1 9.5 Q12.6 10.2 11.7 10.2 L4.3 10.2 Q3.4 10.2 3.9 9.5 Z';
    case 'down':
      return 'M7.3 10.8 Q8 11.6 8.7 10.8 L12.1 6.5 Q12.6 5.8 11.7 5.8 L4.3 5.8 Q3.4 5.8 3.9 6.5 Z';
    case 'left':
      return 'M5.2 7.3 Q4.4 8 5.2 8.7 L9.5 12.1 Q10.2 12.6 10.2 11.7 L10.2 4.3 Q10.2 3.4 9.5 3.9 Z';
    case 'right':
      return 'M10.8 7.3 Q11.6 8 10.8 8.7 L6.5 12.1 Q5.8 12.6 5.8 11.7 L5.8 4.3 Q5.8 3.4 6.5 3.9 Z';
  }
}
