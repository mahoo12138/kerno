export interface TileSpan {
  /** Size in grid columns. */
  columns: number;
  /** Size in grid rows. */
  rows: number;
  /** Start a new strip (column with strip 1) before this tile. */
  newColumn?: boolean;
}

export interface TilePlacement {
  column: number;
  row: number;
}

export interface LayoutResult {
  placements: TilePlacement[];
  /** Columns in use (width of the group in cells). */
  columns: number;
  /** Rows in use (height of the group in cells). */
  rows: number;
}

export interface LayoutOptions {
  /** Rows of cells in the group for horizontal orientation. */
  rows?: number;
  /** Columns of cells in the group for vertical orientation. */
  columns?: number;
  /** `'horizontal'` (default: fixed rows, grows right) or `'vertical'` (fixed columns, grows down). */
  orientation?: 'horizontal' | 'vertical';
  /** Size of a strip across the direction of growth. Defaults to `1`. */
  strip?: number;
}

/**
 * Reads `columns` and `rows` attributes from a tile element, defaulting to
 * a medium tile (`2 × 2` cells).
 */
export function tileSpan(el: Element): { columns: number; rows: number } {
  const read = (name: string): number => {
    const n = Number.parseInt(el.getAttribute(name) || '', 10);
    return n > 0 ? n : 2;
  };
  return { columns: read('columns'), rows: read('rows') };
}

/**
 * Cell-spanning layout algorithm of Windows 8 / Windows 10 tile groups
 * (`WinJS.UI.CellSpanningGroup` / `@ax-design/tile-group`).
 */
export function layoutTiles(spans: TileSpan[], options: LayoutOptions): LayoutResult {
  if (options.orientation === 'vertical') {
    const turned = layoutAcross(
      spans.map((s) => ({
        columns: s.rows,
        rows: s.columns,
        ...(s.newColumn !== undefined ? { newColumn: s.newColumn } : {}),
      })),
      options.columns || 1,
      options.strip,
    );
    return {
      placements: turned.placements.map((p) => ({ column: p.row, row: p.column })),
      columns: turned.rows,
      rows: turned.columns,
    };
  }
  return layoutAcross(spans, options.rows || 1, options.strip);
}

function layoutAcross(
  spans: TileSpan[],
  across: number,
  stripSize: number | undefined,
): LayoutResult {
  const rows = Math.max(1, Math.floor(across));
  const strip = Math.max(1, Math.floor(stripSize || 1));
  const occupied: boolean[][] = [];
  let width = 0;

  const free = (column: number, row: number, span: TileSpan): boolean => {
    if (row + span.rows > rows) return false;
    for (let c = column; c < column + span.columns; c++) {
      const col = occupied[c];
      if (!col) continue;
      for (let r = row; r < row + span.rows; r++) {
        if (col[r]) return false;
      }
    }
    return true;
  };

  const mark = (column: number, row: number, span: TileSpan): void => {
    for (let c = column; c < column + span.columns; c++) {
      const col = occupied[c] || (occupied[c] = []);
      for (let r = row; r < Math.min(rows, row + span.rows); r++) {
        col[r] = true;
      }
    }
    width = Math.max(width, column + span.columns);
  };

  const placements: TilePlacement[] = [];
  let cursor = { strip: 0, row: 0, column: 0 };

  for (const raw of spans) {
    const span: TileSpan = {
      columns: Math.max(1, Math.floor(raw.columns)),
      rows: Math.max(1, Math.floor(raw.rows)),
      ...(raw.newColumn !== undefined ? { newColumn: raw.newColumn } : {}),
    };
    const lastStrip = Math.ceil(width / strip);
    let found: TilePlacement | null = null;
    let s = cursor.strip;
    let row = cursor.row;
    let column = cursor.column;

    if (span.newColumn && width > 0) {
      for (s = cursor.strip + 1; s <= lastStrip && !found; s++) {
        if (free(s * strip, 0, span)) found = { column: s * strip, row: 0 };
      }
    } else {
      for (; s <= lastStrip && !found; s++) {
        for (; row < rows && !found; row++) {
          for (; column < strip && !found; column++) {
            if (free(s * strip + column, row, span)) {
              found = { column: s * strip + column, row };
            }
          }
          column = 0;
        }
        row = 0;
      }
    }

    if (!found) {
      found = { column: Math.max(lastStrip, cursor.strip + (width > 0 ? 1 : 0)) * strip, row: 0 };
    }
    mark(found.column, found.row, span);
    placements.push(found);
    cursor = {
      strip: Math.floor(found.column / strip),
      row: found.row,
      column: found.column % strip,
    };
  }

  let height = 0;
  placements.forEach((p, i) => {
    height = Math.max(height, Math.min(rows, p.row + Math.max(1, Math.floor(spans[i]!.rows))));
  });
  return { placements, columns: width, rows: height };
}
