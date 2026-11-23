import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-indicator>`:
 *
 * --k-indicator-color
 * --k-indicator-fg
 * --k-indicator-size
 * --k-indicator-offset
 * --k-indicator-z-index
 */
export const indicatorStyles = css`
  :host {
    --_bg: var(--k-indicator-color, ${token('color.accent.default')});
    --_fg: var(--k-indicator-fg, ${token('color.accent.fg')});
    --_size: var(--k-indicator-size, 10px);
    --_offset: var(--k-indicator-offset, 0px);

    position: relative;
    display: inline-flex;
    vertical-align: middle;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  :host([variant='success']) {
    --_bg: var(--k-indicator-color, ${token('color.status.success.solid')});
    --_fg: var(--k-indicator-fg, ${token('color.status.success.onSolid')});
  }

  :host([variant='warning']) {
    --_bg: var(--k-indicator-color, ${token('color.status.warning.solid')});
    --_fg: var(--k-indicator-fg, ${token('color.status.warning.onSolid')});
  }

  :host([variant='danger']) {
    --_bg: var(--k-indicator-color, ${token('color.status.danger.solid')});
    --_fg: var(--k-indicator-fg, ${token('color.status.danger.onSolid')});
  }

  :host([variant='neutral']) {
    --_bg: var(--k-indicator-color, ${token('color.fg.secondary')});
    --_fg: var(--k-indicator-fg, ${token('color.bg.canvas')});
  }

  .badge {
    position: absolute;
    z-index: var(--k-indicator-z-index, 2);
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: var(--_size);
    height: var(--_size);
    border-radius: ${token('radius.full')};
    background: var(--_bg);
    color: var(--_fg);
    font-size: ${token('font.size.3xs')};
    font-weight: ${token('font.weight.semibold')};
    line-height: 1;
    white-space: nowrap;
    pointer-events: none;
    user-select: none;
  }

  .badge.has-label {
    min-width: max(18px, var(--_size));
    height: max(18px, var(--_size));
    padding-inline: 5px;
  }

  :host([with-border]) .badge {
    border: 2px solid ${token('color.bg.layer')};
  }

  :host([disabled]) .badge {
    display: none;
  }

  /* 9-position anchoring */
  :host([position='top-start']) .badge {
    top: var(--_offset);
    left: var(--_offset);
    transform: translate(-50%, -50%);
  }

  :host([position='top-center']) .badge {
    top: var(--_offset);
    left: 50%;
    transform: translate(-50%, -50%);
  }

  :host(:not([position])) .badge,
  :host([position='top-end']) .badge {
    top: var(--_offset);
    right: var(--_offset);
    transform: translate(50%, -50%);
  }

  :host([position='middle-start']) .badge {
    top: 50%;
    left: var(--_offset);
    transform: translate(-50%, -50%);
  }

  :host([position='middle-center']) .badge {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  :host([position='middle-end']) .badge {
    top: 50%;
    right: var(--_offset);
    transform: translate(50%, -50%);
  }

  :host([position='bottom-start']) .badge {
    bottom: var(--_offset);
    left: var(--_offset);
    transform: translate(-50%, 50%);
  }

  :host([position='bottom-center']) .badge {
    bottom: var(--_offset);
    left: 50%;
    transform: translate(-50%, 50%);
  }

  :host([position='bottom-end']) .badge {
    bottom: var(--_offset);
    right: var(--_offset);
    transform: translate(50%, 50%);
  }

  /* Processing pulse wave */
  :host([processing]) .badge::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    background: var(--_bg);
    z-index: -1;
    animation: k-indicator-pulse ${token('motion.loop.pulse')} ${token('motion.easing.emphasized')}
      infinite;
  }

  @keyframes k-indicator-pulse {
    0% {
      transform: scale(1);
      opacity: 0.7;
    }
    100% {
      transform: scale(2.1);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :host([processing]) .badge::before {
      animation: none;
      opacity: 0;
    }
  }
`;
