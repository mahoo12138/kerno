import { KernoElement, emit, prop, type PropertyValues } from '@kerno/core';
import { getIcon } from '@kerno/primitives/icon';
import { stepperStepStyles, stepperStyles } from './stepper.styles.js';

export type StepperOrientation = 'horizontal' | 'vertical';
export type StepperSize = 'sm' | 'md' | 'lg';
export type StepSelectPolicy = 'auto' | 'true' | 'false';

export interface StepClickDetail {
  index: number;
  step: KStepperStep;
}

export interface StepChangeDetail {
  active: number;
  previous: number;
}

/**
 * Individual step panel inside `<k-stepper>`.
 *
 * @tag k-stepper-step
 *
 * @slot - Content displayed while this step is active.
 */
export class KStepperStep extends KernoElement {
  static override styles = stepperStepStyles;
  static override template = /* html */ `<slot></slot>`;

  @prop({ reflect: true }) accessor label = '';
  @prop({ reflect: true }) accessor description = '';
  /** Optional icon name from `@kerno/primitives/icon`. */
  @prop({ reflect: true }) accessor icon = '';
  @prop({ type: Boolean, reflect: true }) accessor loading = false;
  @prop({ type: Boolean, reflect: true }) accessor disabled = false;
  @prop({ attribute: 'allow-step-select', reflect: true })
  accessor allowStepSelect: StepSelectPolicy = 'auto';

  override connectedCallback(): void {
    super.connectedCallback();
    emit(this, 'k-stepper-step-connect', { step: this });
  }

  protected override update(_changed: PropertyValues): void {
    emit(this, 'k-stepper-step-update', { step: this });
  }
}

/**
 * Multi-step workflow wizard with completed/active/pending states, Fluent
 * Accent progress connectors, optional per-step loading indicator, and a
 * `completed` final slot when `active >= steps.length`.
 *
 * @tag k-stepper
 *
 * @slot - `<k-stepper-step>` panels.
 * @slot completed - Panel displayed once `active >= steps.length`.
 *
 * @csspart steps - Step indicator bar.
 * @csspart content - Active step panel wrapper.
 *
 * @fires k-step-click - Cancelable event fired when a clickable step header is activated (`{ index, step }`).
 * @fires k-step-change - Fired when `active` step changes via user click (`{ active, previous }`).
 */
export class KStepper extends KernoElement {
  static override styles = stepperStyles;
  static override template = /* html */ `<div part="base" class="base"><div part="steps" class="steps" role="tablist"></div><div part="content" class="content"><slot></slot><div class="completed" hidden><slot name="completed"></slot></div></div></div>`;

  @prop({ type: Number, reflect: true }) accessor active = 0;
  @prop({ reflect: true }) accessor orientation: StepperOrientation = 'horizontal';
  @prop({ reflect: true }) accessor size: StepperSize = 'md';
  @prop({ type: Boolean, attribute: 'allow-next-steps-select', reflect: true })
  accessor allowNextStepsSelect = true;
  @prop({ reflect: true }) accessor label = 'Progress steps';

  #stepsEl!: HTMLDivElement;
  #completedEl!: HTMLDivElement;
  #defaultSlot!: HTMLSlotElement;

  protected override setup(): void {
    this.#stepsEl = this.renderRoot.querySelector('.steps') as HTMLDivElement;
    this.#completedEl = this.renderRoot.querySelector('.completed') as HTMLDivElement;
    this.#defaultSlot = this.renderRoot.querySelector('slot:not([name])') as HTMLSlotElement;

    this.#defaultSlot.addEventListener('slotchange', () => this.#sync());
    this.addEventListener('k-stepper-step-connect', (e) => {
      e.stopPropagation();
      this.#sync();
    });
    this.addEventListener('k-stepper-step-update', (e) => {
      e.stopPropagation();
      this.#sync();
    });
  }

  protected override update(_changed: PropertyValues): void {
    this.#stepsEl.setAttribute('aria-label', this.label || 'Progress steps');
    this.#sync();
  }

  #steps(): KStepperStep[] {
    return this.#defaultSlot
      .assignedElements({ flatten: true })
      .filter((el): el is KStepperStep => el instanceof KStepperStep);
  }

  #canSelect(step: KStepperStep, index: number): boolean {
    if (step.disabled) return false;
    if (step.allowStepSelect === 'true') return true;
    if (step.allowStepSelect === 'false') return false;
    return this.allowNextStepsSelect || index <= this.active;
  }

  #sync(): void {
    const steps = this.#steps();
    const active = Math.max(0, Math.floor(this.active) || 0);
    const checkSvg = getIcon('check') ?? '';
    const loaderSvg = getIcon('loader') ?? '';

    this.#stepsEl.innerHTML = '';

    steps.forEach((step, idx) => {
      const state: 'completed' | 'active' | 'pending' =
        idx < active ? 'completed' : idx === active ? 'active' : 'pending';
      const clickable = this.#canSelect(step, idx);

      step.hidden = idx !== active;
      step.setAttribute('role', 'tabpanel');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'step-btn';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', state === 'active' ? 'true' : 'false');
      if (state === 'active') btn.setAttribute('aria-current', 'step');
      btn.dataset.state = state;
      btn.dataset.index = String(idx);
      btn.disabled = step.disabled || !clickable;
      btn.classList.toggle('locked', !clickable && !step.disabled);
      btn.classList.toggle('is-disabled', step.disabled);

      const iconBox = document.createElement('span');
      iconBox.className = 'icon';
      iconBox.setAttribute('aria-hidden', 'true');
      if (step.loading && state === 'active') {
        iconBox.innerHTML = `<svg class="spin" viewBox="0 0 16 16">${loaderSvg}</svg>`;
      } else if (state === 'completed') {
        iconBox.innerHTML = `<svg viewBox="0 0 16 16">${checkSvg}</svg>`;
      } else if (step.icon && getIcon(step.icon)) {
        iconBox.innerHTML = `<svg viewBox="0 0 16 16">${getIcon(step.icon) ?? ''}</svg>`;
      } else {
        iconBox.textContent = String(idx + 1);
      }

      btn.append(iconBox);

      if (step.label || step.description) {
        const meta = document.createElement('span');
        meta.className = 'meta';
        if (step.label) {
          const lbl = document.createElement('span');
          lbl.className = 'step-label';
          lbl.textContent = step.label;
          meta.append(lbl);
        }
        if (step.description) {
          const desc = document.createElement('span');
          desc.className = 'step-desc';
          desc.textContent = step.description;
          meta.append(desc);
        }
        btn.append(meta);
      }

      btn.addEventListener('click', () => {
        if (!clickable || step.disabled) return;
        const allowed = emit<StepClickDetail>(
          this,
          'k-step-click',
          { index: idx, step },
          { cancelable: true },
        );
        if (allowed && idx !== this.active) {
          const previous = this.active;
          this.active = idx;
          emit<StepChangeDetail>(this, 'k-step-change', { active: idx, previous });
        }
      });

      this.#stepsEl.append(btn);

      if (idx < steps.length - 1) {
        const conn = document.createElement('div');
        conn.className = 'connector';
        conn.classList.toggle('active', idx < active);
        conn.setAttribute('aria-hidden', 'true');
        this.#stepsEl.append(conn);
      }
    });

    this.#completedEl.hidden = steps.length === 0 || active < steps.length;
  }
}
