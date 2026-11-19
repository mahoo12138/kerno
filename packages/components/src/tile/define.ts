import { define } from '@kerno/core';
import '@kerno/effects/define';
import { KTileBoundary } from './boundary.js';
import { KTileGroup } from './group.js';
import { KTile } from './tile.js';

define('k-tile-bound', KTileBoundary);
define('k-tile-group', KTileGroup);
define('k-tile', KTile);

declare global {
  interface HTMLElementTagNameMap {
    'k-tile': KTile;
    'k-tile-group': KTileGroup;
    'k-tile-bound': KTileBoundary;
  }
}
