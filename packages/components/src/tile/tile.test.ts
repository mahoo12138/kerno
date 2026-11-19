import { generateTokensCss } from '@kerno/tokens';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import {
  KTileBoundary,
  bandOffsets,
  dropTarget,
  keyboardTarget,
  layoutTiles,
  moveIndex,
  tileSpan,
  type KTile,
  type KTileGroup,
} from './index.js';

let tokenStyle: HTMLStyleElement;

beforeEach(() => {
  tokenStyle = document.createElement('style');
  tokenStyle.textContent = generateTokensCss();
  document.head.append(tokenStyle);
});

afterEach(() => {
  tokenStyle.remove();
  document.body.innerHTML = '';
});

describe('Cell-spanning layout & reorder algorithms', () => {
  it('places tiles in horizontal and vertical strip scan order and computes drop/keyboard targets', () => {
    const spans = [
      { columns: 4, rows: 2 },
      { columns: 2, rows: 2 },
      { columns: 2, rows: 2 },
      { columns: 1, rows: 1 },
      { columns: 1, rows: 1 },
    ];
    const horizontal = layoutTiles(spans, { orientation: 'horizontal', rows: 4, strip: 4 });
    expect(horizontal.placements[0]).toEqual({ column: 0, row: 0 });
    expect(horizontal.placements[1]).toEqual({ column: 0, row: 2 });
    expect(horizontal.placements[2]).toEqual({ column: 2, row: 2 });
    expect(horizontal.placements[3]).toEqual({ column: 4, row: 0 });
    expect(horizontal.placements[4]).toEqual({ column: 5, row: 0 });
    expect(horizontal.columns).toBe(6);
    expect(horizontal.rows).toBe(4);

    const vertical = layoutTiles(spans, { orientation: 'vertical', columns: 4, strip: 2 });
    expect(vertical.placements[0]).toEqual({ column: 0, row: 0 });
    expect(vertical.placements[1]).toEqual({ column: 0, row: 2 });
    expect(vertical.placements[2]).toEqual({ column: 2, row: 2 });

    expect(moveIndex(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);

    const drop = dropTarget(
      [
        { columns: 2, rows: 2 },
        { columns: 2, rows: 2 },
      ],
      0,
      { column: 2, row: 0 },
      { orientation: 'horizontal', rows: 2, strip: 4 },
    );
    expect(drop.index).toBe(1);

    const kbd = keyboardTarget(
      [
        { columns: 2, rows: 2 },
        { columns: 2, rows: 2 },
      ],
      0,
      'right',
      { orientation: 'horizontal', rows: 2, strip: 4 },
    );
    expect(kbd).toBe(1);

    expect(bandOffsets([100, 0, 200], [2, 1, 3])).toEqual([1, 0, 3]);
  });
});

describe('<k-tile>, <k-tile-group> & <k-tile-bound>', () => {
  it('lays out <k-tile> children on the cell grid and updates when columns/rows change', async () => {
    document.body.innerHTML = `
      <k-tile-group style="--k-tile-cell-width: 60px; --k-tile-cell-height: 60px; --k-tile-gap: 10px; --k-tile-rows: 4">
        <k-tile id="t1" columns="4" rows="2"><button slot="action" type="button">Wide</button></k-tile>
        <k-tile id="t2" columns="2" rows="2"><button slot="action" type="button">Medium</button></k-tile>
        <k-tile id="t3" columns="1" rows="1"><button slot="action" type="button">Small</button></k-tile>
      </k-tile-group>
    `;
    const group = document.querySelector('k-tile-group') as KTileGroup;
    const t1 = document.getElementById('t1') as KTile;
    const t2 = document.getElementById('t2') as KTile;
    const t3 = document.getElementById('t3') as KTile;
    await Promise.all([t1.updateComplete, t2.updateComplete, t3.updateComplete]);

    expect(tileSpan(t1)).toEqual({ columns: 4, rows: 2 });
    expect(t1.style.width).toBe('270px'); // 4 * 70 - 10
    expect(t1.style.height).toBe('130px'); // 2 * 70 - 10
    expect(t1.style.transform).toBe('translate(0px, 0px)');
    expect(t2.style.transform).toBe('translate(0px, 140px)');
    expect(t3.style.width).toBe('60px');

    // Programmatic moveTile() reorders DOM children and fires cancelable tilereorder
    const onReorder = vi.fn();
    group.addEventListener('tilereorder', onReorder);
    const moved = group.moveTile(t1, 2);
    expect(moved).toBe(true);
    expect(onReorder).toHaveBeenCalledOnce();
    expect(group.tiles.map((t) => t.id)).toEqual(['t2', 't3', 't1']);
  });

  it('couples multiple <k-tile-group> desktop entrances inside <k-tile-bound>', async () => {
    document.body.innerHTML = `
      <k-tile-bound style="display: flex; gap: 32px">
        <k-tile-group id="g1" style="--k-tile-rows: 2">
          <k-tile columns="2" rows="2"><button slot="action" type="button">A</button></k-tile>
        </k-tile-group>
        <k-tile-group id="g2" style="--k-tile-rows: 2">
          <k-tile columns="2" rows="2"><button slot="action" type="button">B</button></k-tile>
        </k-tile-group>
      </k-tile-bound>
    `;
    const bound = document.querySelector('k-tile-bound') as KTileBoundary;
    const g1 = document.getElementById('g1') as KTileGroup;
    const g2 = document.getElementById('g2') as KTileGroup;
    expect(bound).toBeInstanceOf(KTileBoundary);
    expect(g1.boundaryInfo().bands).toBe(1);
    expect(g2.boundaryInfo().bands).toBe(1);
  });

  it('supports <k-tile> immediate activation and programmatic 3D flip launch()', async () => {
    document.body.innerHTML = `
      <k-tile
        id="app-tile"
        activation="immediate"
        style="
          width: 150px;
          height: 150px;
          --k-tile-launch-duration: 20ms;
          --k-tile-splash-hold: 10ms;
          --k-tile-splash-fade: 10ms;
          --k-tile-splash-color: #0078d4;
        "
      >
        <button slot="action" type="button">Mail</button>
        <template slot="splash"><span>Mail Splash</span></template>
      </k-tile>
    `;
    const tile = document.getElementById('app-tile') as KTile;
    await tile.updateComplete;
    const btn = tile.actionElement() as HTMLButtonElement;

    const events: string[] = [];
    tile.addEventListener('tilelaunchstart', () => events.push('start'));
    tile.addEventListener('tilelaunchactivate', () => events.push('activate'));
    tile.addEventListener('tilelaunchend', () => events.push('end'));
    btn.addEventListener('click', () => events.push('click'));

    await tile.launch(Promise.resolve());
    expect(events).toEqual(['start', 'activate', 'click', 'end']);
  });
});
