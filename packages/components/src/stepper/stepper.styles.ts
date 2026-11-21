import { css } from '@kerno/core';
import { token } from '@kerno/tokens';

/**
 * Public customization surface for `<k-stepper>`:
 *
 * --k-stepper-icon-size
 * --k-stepper-radius
 */
export const stepperStyles = css`
  :host {
    --_icon-size: var(--k-stepper-icon-size, 34px);
    --_radius: var(--k-stepper-radius, 9999px);
    --_title-size: ${token('font.size.sm')};
    --_desc-size: ${token('font.size.xs')};

    display: block;
    width: 100%;
    font-family: ${token('font.family.sans')};
    color: ${token('color.fg.default')};
  }

  :host([hidden]) {
    display: none;
  }

  :host([size='sm']) {
    --_icon-size: var(--k-stepper-icon-size, 28px);
    --_title-size: ${token('font.size.xs')};
  }

  :host([size='lg']) {
    --_icon-size: var(--k-stepper-icon-size, 40px);
    --_title-size: ${token('font.size.md')};
  }

  .base {
    display: flex;
    flex-direction: column;
    gap: ${token('spacing.lg')};
  }

  :host([orientation='vertical']) .base {
    display: grid;
    grid-template-columns: minmax(210px, 260px) minmax(0, 1fr);
    gap: ${token('spacing.xl')};
    align-items: start;
  }

  @media (max-width: 720px) {
    :host([orientation='vertical']) .base {
      grid-template-columns: 1fr;
    }
  }

  .steps {
    display: flex;
    align-items: center;
    gap: 0;
    width: 100%;
  }

  :host([orientation='vertical']) .steps {
    flex-direction: column;
    align-items: stretch;
  }

  .step-btn {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 4px 2px;
    flex-shrink: 0;
    cursor: pointer;
    border-radius: 2px;
    transition: opacity ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .step-btn:disabled {
    cursor: default;
  }

  .step-btn.locked {
    cursor: default;
  }

  .step-btn.is-disabled {
    opacity: 0.48;
  }

  .step-btn:focus-visible {
    outline: ${token('focus.ringWidth')} solid ${token('color.stroke.focusOuter')};
    outline-offset: 2px;
  }

  .icon {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--_icon-size);
    height: var(--_icon-size);
    flex-shrink: 0;
    border-radius: var(--_radius);
    border: 2px solid ${token('color.stroke.control')};
    background: ${token('color.bg.layerAlt')};
    color: ${token('color.fg.secondary')};
    font-size: var(--_title-size);
    font-weight: ${token('font.weight.semibold')};
    font-variant-numeric: tabular-nums;
    transition:
      background-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      border-color ${token('motion.duration.fast')} ${token('motion.easing.standard')},
      color ${token('motion.duration.fast')} ${token('motion.easing.standard')};
  }

  .step-btn:hover:not(:disabled):not(.locked) .icon {
    border-color: ${token('color.accent.borderHover')};
  }

  .step-btn[data-state='active'] .icon {
    border-color: ${token('color.accent.default')};
    background: color-mix(
      in srgb,
      ${token('color.accent.default')} 15%,
      ${token('color.bg.layer')}
    );
    color: ${token('color.accent.text')};
  }

  .step-btn[data-state='completed'] .icon {
    border-color: ${token('color.accent.default')};
    background: ${token('color.accent.default')};
    color: ${token('color.accent.fg')};
  }

  .step-btn[data-state='completed']:hover:not(:disabled):not(.locked) .icon {
    background: ${token('color.accent.hover')};
    border-color: ${token('color.accent.borderHover')};
  }

  .icon svg {
    width: 15px;
    height: 15px;
    display: block;
  }

  .icon svg.spin {
    animation: k-stepper-spin 0.8s linear infinite;
  }

  @keyframes k-stepper-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .step-label {
    font-size: var(--_title-size);
    font-weight: ${token('font.weight.semibold')};
    color: ${token('color.fg.default')};
    line-height: 1.25;
  }

  .step-btn[data-state='pending'] .step-label {
    color: ${token('color.fg.secondary')};
  }

  .step-desc {
    font-size: var(--_desc-size);
    color: ${token('color.fg.tertiary')};
    line-height: 1.3;
  }

  .connector {
    flex: 1 1 24px;
    height: 2px;
    margin-inline: 10px;
    background: ${token('color.stroke.default')};
    transition: background-color ${token('motion.duration.normal')}
      ${token('motion.easing.standard')};
  }

  .connector.active {
    background: ${token('color.accent.default')};
  }

  :host([orientation='vertical']) .connector {
    flex: 0 0 22px;
    width: 2px;
    height: 22px;
    margin: 2px 0 2px calc(var(--_icon-size) / 2 + 1px);
  }

  .content {
    min-width: 0;
  }

  .completed[hidden] {
    display: none;
  }
`;

export const stepperStepStyles = css`
  :host {
    display: block;
  }

  :host([hidden]) {
    display: none;
  }
`;
