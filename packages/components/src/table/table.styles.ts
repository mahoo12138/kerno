import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

export const tableStyles = css`
  :host {
    display: block;
    width: 100%;
    overflow-x: auto;
  }

  .wrapper {
    border-radius: ${token('radius.lg')};
    border: ${token('control.borderWidth')} solid ${token('color.stroke.default')};
    background: ${token('color.bg.layer')};
    overflow: auto;
    max-height: var(--k-table-max-height, none);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-family: ${token('font.family.sans')};
    font-size: ${token('font.size.sm')};
    color: ${token('color.fg.default')};
  }

  thead {
    background: ${token('color.bg.layerAlt')};
    border-bottom: ${token('control.borderWidth')} solid ${token('color.stroke.default')};
  }

  :host([sticky-header]) thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: ${token('color.bg.layerAlt')};
    box-shadow: inset 0 -1px 0 ${token('color.stroke.default')};
  }

  th {
    padding: 10px ${token('spacing.md')};
    font-weight: ${token('font.weight.semibold')};
    color: ${token('color.fg.secondary')};
    text-align: start;
    white-space: nowrap;
    user-select: none;
  }

  th.sortable {
    cursor: pointer;
  }

  th.sortable:hover {
    color: ${token('color.fg.default')};
    background: ${token('color.subtle.hover')};
  }

  td {
    padding: 10px ${token('spacing.md')};
    border-bottom: ${token('control.borderWidth')} solid ${token('color.stroke.subtle')};
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover {
    background: ${token('color.subtle.hover')};
  }

  :host([striped]) tbody tr:nth-child(even) {
    background: ${token('color.bg.layerAlt')};
  }

  .empty {
    padding: ${token('spacing.xl')};
    text-align: center;
    color: ${token('color.fg.tertiary')};
  }

  .sort-indicator {
    margin-inline-start: 4px;
    font-size: ${token('font.size.xs')};
    color: ${token('color.accent.text')};
  }

  .select-col {
    width: 40px;
    padding-inline: 12px 4px;
    text-align: center;
  }

  tbody tr.selected {
    background: color-mix(in srgb, ${token('color.accent.default')} 14%, transparent);
  }

  tbody tr.selected:hover {
    background: color-mix(in srgb, ${token('color.accent.hover')} 20%, transparent);
  }

  .check-btn {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: 2px solid ${token('color.fg.secondary')};
    background: transparent;
    color: ${token('color.accent.fg')};
    cursor: pointer;
    vertical-align: middle;
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

  .check-btn[aria-checked='true']:active,
  .check-btn[aria-checked='mixed']:active {
    background: ${token('color.accent.active')};
    border-color: transparent;
  }

  .check-btn:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 2px;
  }

  .check-btn svg {
    width: 13px;
    height: 13px;
    display: block;
  }
`;
