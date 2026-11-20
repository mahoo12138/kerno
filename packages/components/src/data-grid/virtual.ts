/**
 * Pure virtual window calculator for `<k-data-grid>`.
 */

export interface VirtualWindow {
  readonly startIndex: number;
  readonly endIndex: number; // exclusive
  readonly totalHeight: number;
  readonly renderedCount: number;
}

export function computeVirtualWindow(
  scrollTop: number,
  viewportHeight: number,
  totalRows: number,
  rowHeight: number,
  overscan = 6,
): VirtualWindow {
  const safeTotal = Math.max(0, Math.floor(totalRows));
  const safeRowH = Math.max(16, Math.floor(rowHeight) || 40);
  const safeViewH = Math.max(safeRowH, viewportHeight || 400);
  const safeOver = Math.max(0, Math.floor(overscan));
  const totalHeight = safeTotal * safeRowH;

  if (safeTotal === 0) {
    return { startIndex: 0, endIndex: 0, totalHeight: 0, renderedCount: 0 };
  }

  const clampedScroll = Math.max(0, Math.min(scrollTop, Math.max(0, totalHeight - safeViewH)));
  const firstVisible = Math.floor(clampedScroll / safeRowH);
  const visibleCount = Math.ceil(safeViewH / safeRowH);

  const startIndex = Math.max(0, firstVisible - safeOver);
  const endIndex = Math.min(safeTotal, firstVisible + visibleCount + safeOver);

  return {
    startIndex,
    endIndex,
    totalHeight,
    renderedCount: Math.max(0, endIndex - startIndex),
  };
}
