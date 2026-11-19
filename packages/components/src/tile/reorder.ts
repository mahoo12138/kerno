import { layoutTiles, type LayoutOptions, type LayoutResult, type TileSpan } from './layout.js';

/** Returns a new array with the item at `from` moved to `to`. */
export function moveIndex<T>(list: T[], from: number, to: number): T[] {
  const out = list.slice();
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item!);
  return out;
}

export interface DropTarget {
  /** Index of the dragged tile in the new order. */
  index: number;
  /** The layout of the new order. */
  layout: LayoutResult;
  /** Distance in cells from the dragged tile's place to where it is held. */
  distance: number;
}

export type Direction = 'left' | 'right' | 'up' | 'down';

const STEPS: Record<Direction, { x: number; y: number }> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

/**
 * Computes the destination index when moving tile `from` one step in `direction`
 * via keyboard (`Alt+Shift+Arrow`).
 */
export function keyboardTarget(
  spans: TileSpan[],
  from: number,
  direction: Direction,
  options: LayoutOptions,
): number {
  const layout = layoutTiles(spans, options);
  const at = layout.placements[from];
  if (!at) return from;
  const d = STEPS[direction];
  const vertical = options.orientation === 'vertical';
  const across = vertical ? options.columns || 1 : options.rows || 1;
  const limitColumn = vertical ? across : layout.columns + 1;
  const limitRow = vertical ? layout.rows + 1 : across;

  for (let k = 1; ; k++) {
    const target = { column: at.column + d.x * k, row: at.row + d.y * k };
    if (
      target.column < 0 ||
      target.row < 0 ||
      target.column >= limitColumn ||
      target.row >= limitRow
    ) {
      return from;
    }
    const r = dropTarget(spans, from, target, { ...options, current: from, hysteresis: 0 });
    if (r.index === from) continue;
    const p = r.layout.placements[r.index]!;
    if ((p.column - at.column) * d.x + (p.row - at.row) * d.y > 0) return r.index;
  }
}

export interface DropOptions extends LayoutOptions {
  /** Index chosen last frame; kept unless another index is closer by more than `hysteresis` cells. */
  current?: number;
  /** Hysteresis threshold in cells. Defaults to `0.5`. */
  hysteresis?: number;
}

/**
 * Finds the best drop index and resulting layout when dragging tile `dragged`
 * at cell coordinate `at`.
 */
export function dropTarget(
  spans: TileSpan[],
  dragged: number,
  at: { column: number; row: number },
  options: DropOptions,
): DropTarget {
  const hysteresis = options.hysteresis === undefined ? 0.5 : options.hysteresis;
  let best: DropTarget | null = null;
  let kept: DropTarget | null = null;

  for (let index = 0; index < spans.length; index++) {
    const layout = layoutTiles(moveIndex(spans, dragged, index), options);
    const p = layout.placements[index]!;
    const distance = Math.hypot(p.column - at.column, p.row - at.row);
    const candidate: DropTarget = { index, layout, distance };
    if (!best || distance < best.distance) best = candidate;
    if (index === options.current) kept = candidate;
  }

  if (kept && best && kept.distance - best.distance <= hysteresis) return kept;
  return best!;
}
