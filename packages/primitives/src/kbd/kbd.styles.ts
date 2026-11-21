import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-kbd>`:
 *
 * --k-kbd-bg
 * --k-kbd-border-color
 * --k-kbd-color
 * --k-kbd-radius
 */
export const kbdStyles = css`
  :host {
    --_font-size: ${token('font.size.xs')};
    --_pad-y: 2px;
    --_pad-x: 6px;
    --_min-w: 22px;

    display: inline-flex;
    vertical-align: middle;
    font-family: ${token('font.family.mono')};
  }

  :host([hidden]) {
    display: none;
  }

  :host([size='xs']) {
    --_font-size: 10px;
    --_pad-y: 1px;
    --_pad-x: 4px;
    --_min-w: 18px;
  }

  :host([size='md']) {
    --_font-size: ${token('font.size.sm')};
    --_pad-y: 3px;
    --_pad-x: 8px;
    --_min-w: 26px;
  }

  :host([size='lg']) {
    --_font-size: ${token('font.size.md')};
    --_pad-y: 4px;
    --_pad-x: 10px;
    --_min-w: 30px;
  }

  kbd {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: var(--_min-w);
    padding: var(--_pad-y) var(--_pad-x);
    border: 1px solid var(--k-kbd-border-color, ${token('color.stroke.control')});
    border-bottom-width: 3px;
    border-radius: var(--k-kbd-radius, 2px);
    background: var(--k-kbd-bg, ${token('color.bg.layerAlt')});
    color: var(--k-kbd-color, ${token('color.fg.default')});
    font-family: inherit;
    font-size: var(--_font-size);
    font-weight: ${token('font.weight.semibold')};
    line-height: 1.25;
    white-space: nowrap;
    user-select: none;
  }
`;
