import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-avatar>`:
 *
 * --k-avatar-size
 * --k-avatar-radius
 * --k-avatar-bg
 * --k-avatar-fg
 * --k-avatar-border-color
 * --k-avatar-ring-color
 */
export const avatarStyles = css`
  :host {
    --_size: 36px;
    --_font-size: ${token('font.size.sm')};
    --_radius: ${token('radius.full')};
    --_bg: ${token('color.control.default')};
    --_fg: ${token('color.fg.default')};
    --_border: ${token('color.stroke.control')};
    --_status-size: 9px;

    display: inline-flex;
    vertical-align: middle;
    position: relative;
    flex-shrink: 0;
  }

  :host([hidden]) {
    display: none;
  }

  :host([size='xs']) {
    --_size: 24px;
    --_font-size: 0.6875rem;
    --_status-size: 7px;
  }

  :host([size='sm']) {
    --_size: 28px;
    --_font-size: ${token('font.size.xs')};
    --_status-size: 8px;
  }

  :host([size='lg']) {
    --_size: 44px;
    --_font-size: ${token('font.size.md')};
    --_status-size: 11px;
  }

  :host([size='xl']) {
    --_size: 56px;
    --_font-size: ${token('font.size.lg')};
    --_status-size: 13px;
  }

  :host([shape='rounded']) {
    --_radius: 0px;
  }

  :host([shape='chamfer']),
  :host([shape='scallop']),
  :host([shape='notch']) {
    --_radius: 8px;
  }

  :host([variant='accent']) {
    --_bg: ${token('color.accent.default')};
    --_fg: ${token('color.accent.fg')};
    --_border: transparent;
  }

  .base {
    position: relative;
    display: inline-flex;
    width: var(--k-avatar-size, var(--_size));
    height: var(--k-avatar-size, var(--_size));
    user-select: none;
  }

  .frame {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: var(--k-avatar-radius, var(--_radius));
    border: 1px solid var(--k-avatar-border-color, var(--_border));
    background: var(--k-avatar-bg, var(--_bg));
    color: var(--k-avatar-fg, var(--_fg));
    font-family: ${token('font.family.sans')};
    font-size: var(--_font-size);
    font-weight: ${token('font.weight.semibold')};
    line-height: 1;
    letter-spacing: 0.02em;
  }

  :host([shape='chamfer']) .frame,
  :host([shape='scallop']) .frame,
  :host([shape='notch']) .frame {
    border-color: transparent;
  }

  .shape-stroke {
    position: absolute;
    inset: -1px;
    width: calc(100% + 2px);
    height: calc(100% + 2px);
    pointer-events: none;
    overflow: visible;
    fill: none;
    stroke: var(--k-avatar-border-color, var(--_border));
    stroke-width: 1.5px;
  }

  .image {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .image[hidden] {
    display: none;
  }

  .fallback {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .fallback[hidden],
  .fallback-content[hidden] {
    display: none;
  }

  .fallback-content {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .fallback svg {
    width: 54%;
    height: 54%;
    display: block;
  }

  .status {
    position: absolute;
    right: -1px;
    bottom: -1px;
    z-index: 2;
    width: var(--_status-size);
    height: var(--_status-size);
    border-radius: ${token('radius.full')};
    box-shadow: 0 0 0 2px var(--k-avatar-ring-color, ${token('color.bg.layer')});
    background: ${token('color.fg.tertiary')};
  }

  .status[hidden] {
    display: none;
  }

  :host([status='online']) .status {
    background: ${token('color.status.success.solid')};
  }

  :host([status='busy']) .status {
    background: ${token('color.status.danger.solid')};
  }

  :host([status='away']) .status {
    background: ${token('color.status.warning.solid')};
  }

  :host([status='offline']) .status {
    background: ${token('color.fg.tertiary')};
  }
`;

export const avatarGroupStyles = css`
  :host {
    --_group-size: 36px;
    --_group-font-size: ${token('font.size.xs')};

    display: inline-flex;
    align-items: center;
    vertical-align: middle;
  }

  :host([hidden]) {
    display: none;
  }

  :host([size='xs']) {
    --_group-size: 24px;
    --_group-font-size: 0.625rem;
    --k-avatar-size: 24px;
  }

  :host([size='sm']) {
    --_group-size: 28px;
    --_group-font-size: 0.6875rem;
    --k-avatar-size: 28px;
  }

  :host([size='md']) {
    --_group-size: 36px;
    --_group-font-size: ${token('font.size.xs')};
    --k-avatar-size: 36px;
  }

  :host([size='lg']) {
    --_group-size: 44px;
    --_group-font-size: ${token('font.size.sm')};
    --k-avatar-size: 44px;
  }

  :host([size='xl']) {
    --_group-size: 56px;
    --_group-font-size: ${token('font.size.md')};
    --k-avatar-size: 56px;
  }

  .base {
    display: inline-flex;
    align-items: center;
  }

  ::slotted(k-avatar) {
    position: relative;
    margin-inline-start: var(--k-avatar-group-overlap, -8px);
    border-radius: ${token('radius.full')};
    box-shadow: 0 0 0 2px var(--k-avatar-ring-color, ${token('color.bg.layer')});
    transition: transform ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  ::slotted(k-avatar:first-child) {
    margin-inline-start: 0;
  }

  ::slotted(k-avatar:hover) {
    z-index: 2;
    transform: translateY(-2px);
  }

  ::slotted([data-k-avatar-overflow]) {
    display: none !important;
  }

  .overflow {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--k-avatar-size, var(--_group-size));
    height: var(--k-avatar-size, var(--_group-size));
    margin-inline-start: var(--k-avatar-group-overlap, -8px);
    border-radius: ${token('radius.full')};
    border: 1px solid ${token('color.stroke.control')};
    background: ${token('color.bg.layerAlt')};
    color: ${token('color.fg.secondary')};
    box-shadow: 0 0 0 2px var(--k-avatar-ring-color, ${token('color.bg.layer')});
    font-family: ${token('font.family.sans')};
    font-size: var(--_group-font-size);
    font-weight: ${token('font.weight.semibold')};
    user-select: none;
  }

  .overflow[hidden] {
    display: none;
  }
`;
