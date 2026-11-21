import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-timeline>` / `<k-timeline-item>`:
 *
 * --k-timeline-bullet-size
 * --k-timeline-line-width
 * --k-timeline-color
 */
export const timelineStyles = css`
  :host {
    --_bullet-size: var(--k-timeline-bullet-size, 22px);
    --_line-width: var(--k-timeline-line-width, 2px);

    display: flex;
    flex-direction: column;
    width: 100%;
    font-family: ${token('font.family.sans')};
  }

  :host([hidden]) {
    display: none;
  }
`;

export const timelineItemStyles = css`
  :host {
    --_bullet-size: var(--k-timeline-bullet-size, 22px);
    --_line-width: var(--k-timeline-line-width, 2px);
    --_accent: var(--k-timeline-color, ${token('color.accent.default')});

    position: relative;
    display: flex;
    gap: 14px;
    padding-bottom: 20px;
    font-family: ${token('font.family.sans')};
    color: ${token('color.fg.default')};
  }

  :host([hidden]) {
    display: none;
  }

  :host([data-last]) {
    padding-bottom: 0;
  }

  :host([data-align='right']) {
    flex-direction: row-reverse;
    text-align: right;
  }

  .rail {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: var(--_bullet-size);
  }

  .bullet {
    position: relative;
    z-index: 2;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--_bullet-size);
    height: var(--_bullet-size);
    border-radius: 9999px;
    border: 2px solid ${token('color.stroke.control')};
    background: ${token('color.bg.layer')};
    color: ${token('color.fg.secondary')};
    font-size: 11px;
    font-weight: ${token('font.weight.semibold')};
    overflow: hidden;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  :host([data-active]) .bullet {
    border-color: var(--_accent);
    background: var(--_accent);
    color: ${token('color.accent.fg')};
  }

  .bullet svg {
    width: 12px;
    height: 12px;
    display: block;
  }

  .line {
    position: absolute;
    top: var(--_bullet-size);
    bottom: -20px;
    left: calc(50% - var(--_line-width) / 2);
    width: 0;
    border-left: var(--_line-width) solid ${token('color.stroke.default')};
    transition: border-color ${token('motion.duration.normal')} ${token('motion.easing.standard')};
  }

  :host([line-variant='dashed']) .line {
    border-left-style: dashed;
  }

  :host([line-variant='dotted']) .line {
    border-left-style: dotted;
  }

  :host([data-line-active]) .line {
    border-left-color: var(--_accent);
  }

  :host([data-last]) .line {
    display: none;
  }

  .body {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 1px;
  }

  .title {
    margin: 0;
    font-size: ${token('font.size.sm')};
    font-weight: ${token('font.weight.semibold')};
    color: ${token('color.fg.default')};
    line-height: 1.35;
  }

  .title:empty {
    display: none;
  }

  .content {
    font-size: ${token('font.size.sm')};
    color: ${token('color.fg.secondary')};
    line-height: 1.5;
  }

  .timestamp {
    font-family: ${token('font.family.mono')};
    font-size: ${token('font.size.xs')};
    color: ${token('color.fg.tertiary')};
    margin-top: 2px;
  }

  .timestamp:empty {
    display: none;
  }
`;
