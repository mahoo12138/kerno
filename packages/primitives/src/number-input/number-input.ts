import {
  AriaForwardingController,
  FormAssociatedElement,
  emit,
  isComposing,
  prop,
  setLabels,
  type PropertyValues,
} from '@kerno/core';
import type { CornerKind } from '@kerno/effects/shape';
import { LazyShapeOutlineController } from '@kerno/effects/shape/lazy';
import { getIcon } from '../icon/registry.js';
import { numberInputStyles } from './number-input.styles.js';

export type NumberInputSize = 'sm' | 'md' | 'lg';

function inferDecimals(step: number): number {
  const s = String(step);
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

function roundTo(val: number, decimals: number): number {
  const factor = 10 ** Math.max(0, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

/**
 * Form-associated numeric input with increment/decrement steppers, hold-to-repeat,
 * precision-safe stepping, keyboard navigation (`ArrowUp`/`ArrowDown`/`PageUp`/`PageDown`),
 * native constraint validation, and parametric `shape` support.
 *
 * @tag k-number-input
 *
 * @slot prefix - Optional leading unit/currency symbol.
 * @slot suffix - Optional trailing unit label (e.g. `"px"`, `"%"`).
 *
 * @csspart base - Outer bordered container.
 * @csspart input - Native `<input inputmode="decimal">`.
 * @csspart decrement - Decrement (`−`) stepper button.
 * @csspart increment - Increment (`+`) stepper button.
 *
 * @fires input - Fired when the numeric value changes.
 * @fires change - Fired when the value is committed.
 */
export class KNumberInput extends FormAssociatedElement {
  static override styles = numberInputStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div part="base" class="base"><span class="prefix"><slot name="prefix"></slot></span><input part="input" class="input" type="text" inputmode="decimal" role="spinbutton" autocomplete="off" /><span class="suffix"><slot name="suffix"></slot></span><div class="steppers"><button part="decrement" class="step-btn dec-btn" type="button" tabindex="-1" aria-label="Decrease value"></button><button part="increment" class="step-btn inc-btn" type="button" tabindex="-1" aria-label="Increase value"></button></div></div>`;
  static override readonly blocksImplicitSubmission = true;

  /** Current numeric value (`null` when empty). */
  @prop({
    converter: {
      fromAttribute: (v) => {
        if (v === null || v.trim() === '') return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      },
      toAttribute: (v) => (v === null || v === undefined ? null : String(v)),
    },
  })
  accessor value: number | null = null;

  @prop({ type: Number }) accessor min: number | null = null;
  @prop({ type: Number }) accessor max: number | null = null;
  @prop({ type: Number }) accessor step = 1;
  @prop({ type: Number }) accessor precision: number | null = null;
  @prop({ reflect: true }) accessor placeholder = '';
  @prop({ reflect: true }) accessor size: NumberInputSize = 'md';
  @prop({ reflect: true }) accessor shape: CornerKind = 'rounded';
  @prop({ type: Boolean, reflect: true }) accessor readonly = false;
  @prop({ type: Boolean, attribute: 'hide-steppers', reflect: true }) accessor hideSteppers = false;

  #base!: HTMLDivElement;
  #input!: HTMLInputElement;
  #decBtn!: HTMLButtonElement;
  #incBtn!: HTMLButtonElement;

  #defaultValue: number | null = null;
  #defaultCaptured = false;
  #badInput = false;
  #repeatDelay: ReturnType<typeof setTimeout> | null = null;
  #repeatTimer: ReturnType<typeof setInterval> | null = null;

  readonly #shapeOutline = new LazyShapeOutlineController(this, {
    getTarget: () => this.#base ?? null,
    getKind: () => this.shape,
  });

  constructor() {
    super();
    // Forward host aria-label / aria-labelledby / <label for> to the focused inner element.
    new AriaForwardingController(this, { getTarget: () => this.#input });
  }

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      this.#defaultValue = this.value;
      this.#defaultCaptured = true;
    }
    super.connectedCallback();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stopRepeat();
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.#badInput = false;
    this.value = this.#defaultValue;
    if (this.#input) {
      this.#input.value = this.#formatValue(this.value);
      this.#syncFormAndValidity();
    }
  }

  /** Steps the current value up by `multiplier * step`. */
  stepUp(multiplier = 1): void {
    this.#stepBy(1, multiplier);
  }

  /** Steps the current value down by `multiplier * step`. */
  stepDown(multiplier = 1): void {
    this.#stepBy(-1, multiplier);
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLDivElement;
    this.#input = this.renderRoot.querySelector('.input') as HTMLInputElement;
    this.#decBtn = this.renderRoot.querySelector('.dec-btn') as HTMLButtonElement;
    this.#incBtn = this.renderRoot.querySelector('.inc-btn') as HTMLButtonElement;

    this.#decBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('minus') ?? ''}</svg>`;
    this.#incBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('plus') ?? ''}</svg>`;

    for (const slot of this.renderRoot.querySelectorAll<HTMLSlotElement>('slot[name]')) {
      const sync = (): void => {
        slot.parentElement?.classList.toggle('has-content', slot.assignedNodes().length > 0);
      };
      slot.addEventListener('slotchange', sync);
      sync();
    }

    this.#input.addEventListener('input', () => {
      this.#parseRawInput(this.#input.value, false);
    });

    this.#input.addEventListener('blur', () => {
      this.#commitRawInput();
    });

    this.#input.addEventListener('keydown', (e) => {
      if (this.isDisabled || this.readonly || isComposing(e)) return;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.stepUp(1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.stepDown(1);
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        this.stepUp(10);
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        this.stepDown(10);
      } else if (e.key === 'Home' && this.min !== null) {
        e.preventDefault();
        this.#applySteppedValue(this.min);
      } else if (e.key === 'End' && this.max !== null) {
        e.preventDefault();
        this.#applySteppedValue(this.max);
      } else if (e.key === 'Enter') {
        this.#commitRawInput();
        if (this.form) {
          e.preventDefault();
          this.submitImplicitly();
        }
      }
    });

    const wireStepper = (btn: HTMLButtonElement, dir: 1 | -1): void => {
      btn.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || this.isDisabled || this.readonly || btn.disabled) return;
        e.preventDefault();
        this.#input.focus();
        this.#stepBy(dir, 1);
        this.#stopRepeat();
        this.#repeatDelay = setTimeout(() => {
          this.#repeatTimer = setInterval(() => {
            if (btn.disabled || this.isDisabled || this.readonly) {
              this.#stopRepeat();
              return;
            }
            this.#stepBy(dir, 1);
          }, 60);
        }, 350);
      });
      const stop = (): void => this.#stopRepeat();
      btn.addEventListener('pointerup', stop);
      btn.addEventListener('pointerleave', stop);
      btn.addEventListener('pointercancel', stop);
    };

    wireStepper(this.#decBtn, -1);
    wireStepper(this.#incBtn, 1);
  }

  protected override update(changed: PropertyValues): void {
    // Localized labels; re-applied whenever the language changes.
    setLabels(this.renderRoot, [
      ['.dec-btn', this.localize.term('decrement')],
      ['.inc-btn', this.localize.term('increment')],
    ]);
    const disabled = this.isDisabled;
    this.#base.classList.toggle('disabled', disabled);
    this.#input.disabled = disabled;
    this.#input.readOnly = this.readonly;
    this.#input.placeholder = this.placeholder;

    if (this.min !== null) this.#input.setAttribute('aria-valuemin', String(this.min));
    else this.#input.removeAttribute('aria-valuemin');

    if (this.max !== null) this.#input.setAttribute('aria-valuemax', String(this.max));
    else this.#input.removeAttribute('aria-valuemax');

    if (this.value !== null) this.#input.setAttribute('aria-valuenow', String(this.value));
    else this.#input.removeAttribute('aria-valuenow');

    if (
      !this.#badInput &&
      document.activeElement !== this &&
      this.shadowRoot?.activeElement !== this.#input
    ) {
      this.#input.value = this.#formatValue(this.value);
    } else if (changed.has('value') && !this.#badInput) {
      const formatted = this.#formatValue(this.value);
      if (this.#input.value !== formatted) this.#input.value = formatted;
    }

    const atMin = this.value !== null && this.min !== null && this.value <= this.min;
    const atMax = this.value !== null && this.max !== null && this.value >= this.max;
    this.#decBtn.disabled = disabled || this.readonly || atMin;
    this.#incBtn.disabled = disabled || this.readonly || atMax;

    this.#syncFormAndValidity();

    if (changed.has('shape') || changed.has('size') || changed.has('hideSteppers')) {
      this.#shapeOutline.sync();
    }
  }

  #effectiveDecimals(): number {
    if (this.precision !== null && this.precision >= 0) return Math.floor(this.precision);
    return inferDecimals(this.step || 1);
  }

  #formatValue(val: number | null): string {
    if (val === null || !Number.isFinite(val)) return '';
    if (this.precision !== null && this.precision >= 0) {
      return val.toFixed(Math.floor(this.precision));
    }
    return String(val);
  }

  #clamp(val: number): number {
    let next = roundTo(val, this.#effectiveDecimals());
    if (this.min !== null && next < this.min) next = this.min;
    if (this.max !== null && next > this.max) next = this.max;
    return next;
  }

  #stepBy(dir: 1 | -1, multiplier: number): void {
    if (this.isDisabled || this.readonly) return;
    const step = Number.isFinite(this.step) && this.step > 0 ? this.step : 1;
    const base = this.value ?? (this.min !== null ? this.min : 0);
    const next = this.#clamp(base + dir * step * multiplier);
    this.#applySteppedValue(next);
  }

  #applySteppedValue(next: number): void {
    this.#badInput = false;
    const changed = next !== this.value;
    this.value = next;
    this.#input.value = this.#formatValue(next);
    this.markInteracted();
    this.#syncFormAndValidity();
    if (changed) {
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      emit(this, 'k-change', { value: next });
    }
  }

  #parseRawInput(raw: string, commit: boolean): void {
    const trimmed = raw.trim();
    this.markInteracted();
    if (trimmed === '') {
      this.#badInput = false;
      this.value = null;
      this.#syncFormAndValidity();
      if (commit) this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      return;
    }
    if (!commit && (trimmed === '-' || trimmed === '.' || trimmed === '-.')) {
      this.#badInput = true;
      this.#syncFormAndValidity();
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      this.#badInput = true;
      this.#syncFormAndValidity();
      return;
    }
    this.#badInput = false;
    this.value = commit ? this.#clamp(parsed) : parsed;
    if (commit) {
      this.#input.value = this.#formatValue(this.value);
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
    this.#syncFormAndValidity();
  }

  #commitRawInput(): void {
    if (this.isDisabled || this.readonly) return;
    this.#parseRawInput(this.#input.value, true);
  }

  #syncFormAndValidity(): void {
    this.setFormValue(this.isDisabled || this.value === null ? null : String(this.value));
    if (this.isDisabled || this.readonly) {
      this.setValidity({});
      return;
    }
    if (this.#badInput) {
      this.setValidity({ badInput: true }, this.localize.term('badNumber'), this.#input);
      return;
    }
    if (this.required && this.value === null) {
      this.setValidity({ valueMissing: true }, this.localize.term('valueMissing'), this.#input);
      return;
    }
    if (this.value !== null && this.min !== null && this.value < this.min) {
      this.setValidity(
        { rangeUnderflow: true },
        this.localize.term('rangeUnderflow', this.localize.number(this.min)),
        this.#input,
      );
      return;
    }
    if (this.value !== null && this.max !== null && this.value > this.max) {
      this.setValidity(
        { rangeOverflow: true },
        this.localize.term('rangeOverflow', this.localize.number(this.max)),
        this.#input,
      );
      return;
    }
    this.setValidity({});
  }

  #stopRepeat(): void {
    if (this.#repeatDelay !== null) {
      clearTimeout(this.#repeatDelay);
      this.#repeatDelay = null;
    }
    if (this.#repeatTimer !== null) {
      clearInterval(this.#repeatTimer);
      this.#repeatTimer = null;
    }
  }
}
