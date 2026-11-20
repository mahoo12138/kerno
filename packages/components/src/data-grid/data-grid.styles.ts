import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-data-grid>`:
 *
 * --k-data-grid-height
 * --k-data-grid-radius
 */
export const dataGridStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    width: 100%;
    border: 1px solid ${token('color.stroke.default')};
    border-radius: var(--k-data-grid-radius, 0px);
    background: ${token('color.bg.layer')};
    color: ${token('color.fg.default')};
    font-family: ${token('font.family.sans')};
    overflow: hidden;
  }

  :host([hidden]) {
    display: none;
  }

  .viewport {
    position: relative;
    width: 100%;
    height: var(--k-data-grid-height, 380px);
    overflow: auto;
    overscroll-behavior: contain;
  }

  .header {
    position: sticky;
    top: 0;
    z-index: 3;
    display: grid;
    grid-template-columns: var(--_grid-cols);
    min-width: max-content;
    width: 100%;
    background: ${token('color.bg.layerAlt')};
    border-bottom: 1px solid ${token('color.stroke.control')};
    user-select: none;
  }

  .th {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 12px;
    font-size: ${token('font.size.xs')};
    font-weight: ${token('font.weight.semibold')};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${token('color.fg.secondary')};
    overflow: hidden;
    white-space: nowrap;
  }

  .th.align-right,
  .td.align-right {
    justify-content: flex-end;
    text-align: right;
  }

  .th.align-center,
  .td.align-center {
    justify-content: center;
    text-align: center;
  }

  .th.sortable {
    cursor: pointer;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .th.sortable:hover {
    background: ${token('color.subtle.hover')};
    color: ${token('color.fg.default')};
  }

  .th:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: -2px;
  }

  .sort-ind {
    color: ${token('color.accent.text')};
    font-size: 10px;
  }

  .resizer {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 6px;
    cursor: col-resize;
    z-index: 2;
  }

  .resizer::after {
    content: '';
    position: absolute;
    top: 8px;
    bottom: 8px;
    right: 2px;
    width: 1px;
    background: ${token('color.stroke.default')};
    transition: background-color 100ms ease;
  }

  .resizer:hover::after,
  .resizer.active::after {
    width: 2px;
    background: ${token('color.accent.default')};
  }

  .body {
    position: relative;
    min-width: max-content;
    width: 100%;
  }

  .row {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    box-sizing: border-box;
    display: grid;
    grid-template-columns: var(--_grid-cols);
    border-bottom: 1px solid ${token('color.stroke.subtle')};
    background: ${token('color.bg.layer')};
    font-size: ${token('font.size.sm')};
    transition: background-color 60ms linear;
  }

  :host([striped]) .row[data-even='true'] {
    background: color-mix(in srgb, ${token('color.bg.layerAlt')} 55%, ${token('color.bg.layer')});
  }

  .row:hover {
    background: ${token('color.subtle.hover')};
  }

  .row.selected {
    background: color-mix(
      in srgb,
      ${token('color.accent.default')} 15%,
      ${token('color.bg.layer')}
    );
  }

  .row.selected:hover {
    background: color-mix(in srgb, ${token('color.accent.hover')} 22%, ${token('color.bg.layer')});
  }

  .td {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    padding: 0 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .select-cell {
    justify-content: center;
    padding: 0;
  }

  .check-btn {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border: 2px solid ${token('color.fg.secondary')};
    background: transparent;
    color: ${token('color.accent.fg')};
    cursor: pointer;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .check-btn:hover {
    border-color: ${token('color.fg.default')};
  }

  .check-btn[aria-checked='true'],
  .check-btn[aria-checked='mixed'] {
    background: ${token('color.accent.default')};
    border-color: transparent;
  }

  .check-btn[aria-checked='true']:hover,
  .check-btn[aria-checked='mixed']:hover {
    background: ${token('color.accent.hover')};
    border-color: ${token('color.accent.borderHover')};
  }

  .check-btn:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 2px;
  }

  .check-btn svg {
    width: 12px;
    height: 12px;
    display: block;
  }

  .empty {
    padding: 36px 16px;
    text-align: center;
    font-size: ${token('font.size.sm')};
    color: ${token('color.fg.tertiary')};
  }

  .empty[hidden] {
    display: none;
  }

  .footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid ${token('color.stroke.default')};
    background: ${token('color.bg.layerAlt')};
    font-size: ${token('font.size.xs')};
    font-family: ${token('font.family.mono')};
    font-variant-numeric: tabular-nums;
    color: ${token('color.fg.secondary')};
  }

  .footer[hidden] {
    display: none;
  }
`;
