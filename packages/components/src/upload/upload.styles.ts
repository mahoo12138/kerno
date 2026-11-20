import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-upload>`:
 *
 * --k-upload-radius
 * --k-upload-padding
 * --k-upload-bg
 */
export const uploadStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    gap: ${token('spacing.sm')};
    width: 100%;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }

  .native-input {
    display: none;
  }

  .dropzone {
    all: unset;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    min-height: 112px;
    padding: var(--k-upload-padding, 20px 16px);
    border-radius: var(--k-upload-radius, 0px);
    border: 2px dashed ${token('color.stroke.strong')};
    background: var(--k-upload-bg, ${token('color.bg.layer')});
    color: ${token('color.fg.default')};
    text-align: center;
    cursor: pointer;
    user-select: none;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .dropzone:hover:not(:disabled) {
    border-color: ${token('color.accent.default')};
    background: color-mix(in srgb, ${token('color.accent.default')} 6%, ${token('color.bg.layer')});
  }

  .dropzone.dragging {
    border-style: solid;
    border-color: ${token('color.accent.default')};
    background: color-mix(
      in srgb,
      ${token('color.accent.default')} 14%,
      ${token('color.bg.layer')}
    );
  }

  .dropzone:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: ${token('focus.ringOffset')};
  }

  :host([data-user-invalid]) .dropzone {
    border-color: ${token('color.status.danger.solid')};
  }

  .dropzone:disabled {
    cursor: default;
    border-color: ${token('color.stroke.default')};
    background: ${token('color.control.disabled')};
    color: ${token('color.fg.disabled')};
  }

  .drop-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: ${token('color.accent.text')};
  }

  .dropzone:disabled .drop-icon {
    color: ${token('color.fg.disabled')};
  }

  .drop-icon svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .drop-label {
    font-size: ${token('font.size.sm')};
    font-weight: ${token('font.weight.medium')};
  }

  .drop-hint {
    font-size: ${token('font.size.xs')};
    color: ${token('color.fg.tertiary')};
  }

  .drop-hint:empty {
    display: none;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .list:empty {
    display: none;
  }

  .item {
    position: relative;
    display: flex;
    align-items: center;
    gap: ${token('spacing.sm')};
    padding: 8px 10px 8px 13px;
    border: 1px solid ${token('color.stroke.default')};
    background: ${token('color.bg.layerAlt')};
    overflow: hidden;
  }

  .item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: ${token('color.accent.default')};
  }

  .item[data-status='done']::before {
    background: ${token('color.status.success.solid')};
  }

  .item[data-status='error']::before {
    background: ${token('color.status.danger.solid')};
  }

  .file-icon {
    display: inline-flex;
    width: 16px;
    height: 16px;
    color: ${token('color.fg.secondary')};
    flex-shrink: 0;
  }

  .file-icon svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .file-meta {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .file-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .file-name {
    font-size: ${token('font.size.sm')};
    font-weight: ${token('font.weight.medium')};
    color: ${token('color.fg.default')};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    font-size: ${token('font.size.xs')};
    font-family: ${token('font.family.mono')};
    color: ${token('color.fg.tertiary')};
    flex-shrink: 0;
  }

  .file-error {
    font-size: ${token('font.size.xs')};
    color: ${token('color.status.danger.fg')};
  }

  .bar-track {
    width: 100%;
    height: 3px;
    background: ${token('color.stroke.control')};
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: ${token('color.accent.default')};
    transition: width 120ms linear;
  }

  .item[data-status='done'] .bar-fill {
    background: ${token('color.status.success.solid')};
  }

  .item[data-status='error'] .bar-fill {
    background: ${token('color.status.danger.solid')};
  }

  .remove-btn {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: ${token('color.fg.secondary')};
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .remove-btn:hover:not(:disabled) {
    background: ${token('color.subtle.hover')};
    color: ${token('color.status.danger.fg')};
  }

  .remove-btn:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 1px;
  }

  .remove-btn svg {
    width: 14px;
    height: 14px;
    display: block;
  }
`;
