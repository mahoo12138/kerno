import { FormAssociatedElement, emit, prop, state, type PropertyValues } from '@kerno/core';
import { isCornerKind, toClipPath, toSvgPath, type CornerKind } from '@kerno/effects/shape';
import { getIcon } from '../icon/registry.js';
import { inputStyles } from './input.styles.js';

export type InputType = 'text' | 'password' | 'email' | 'number' | 'search' | 'tel' | 'url';
export type InputSize = 'sm' | 'md' | 'lg';
export type InputShape = CornerKind;

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Form-associated text input control with prefix/suffix slots, clearable and
 * password-visibility actions, native constraint validation, and parametric shapes.
 *
 * @tag k-input
 *
 * @slot prefix - Leading icon or adornment.
 * @slot suffix - Trailing icon or adornment.
 *
 * @csspart base - Outer input frame.
 * @csspart prefix - Prefix wrapper.
 * @csspart input - Native `<input>`.
 * @csspart clear-button - Clear value button.
 * @csspart password-button - Password visibility toggle button.
 * @csspart suffix - Suffix wrapper.
 *
 * @fires input - Native composed `input` event when value changes.
 * @fires change - Native-like composed `change` event when value is committed.
 * @fires k-clear - Fired when the clear button is activated.
 */
export class KInput extends FormAssociatedElement {
  static override styles = inputStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div part="base" class="base"><span part="prefix" class="prefix"><slot name="prefix"></slot></span><input part="input" class="input" type="text" /><button part="clear-button" class="action-btn clear-btn" type="button" tabindex="-1" aria-label="Clear" hidden></button><button part="password-button" class="action-btn password-btn" type="button" tabindex="-1" aria-label="Show password" hidden></button><span part="suffix" class="suffix"><slot name="suffix"></slot></span></div>`;

  @prop() accessor value = '';
  @prop({ reflect: true }) accessor type: InputType = 'text';
  @prop({ reflect: true }) accessor placeholder = '';
  @prop({ reflect: true }) accessor size: InputSize = 'md';
  @prop({ reflect: true }) accessor shape: InputShape = 'rounded';
  @prop({ type: Boolean, reflect: true }) accessor readonly = false;
  @prop({ type: Boolean, reflect: true }) accessor clearable = false;
  @prop({ type: Boolean, attribute: 'password-toggle', reflect: true })
  accessor passwordToggle = false;
  @prop({ type: Number, attribute: 'minlength' }) accessor minLength: number | null = null;
  @prop({ type: Number, attribute: 'maxlength' }) accessor maxLength: number | null = null;
  @prop() accessor min = '';
  @prop() accessor max = '';
  @prop() accessor step = '';
  @prop() accessor pattern = '';
  @prop() accessor autocomplete = '';

  @state() accessor #passwordVisible = false;

  #base!: HTMLDivElement;
  #input!: HTMLInputElement;
  #clearBtn!: HTMLButtonElement;
  #passwordBtn!: HTMLButtonElement;
  #defaultValue = '';
  #defaultCaptured = false;
  #shapeObserver: ResizeObserver | null = null;
  #shapeSvg: SVGSVGElement | null = null;
  #shapePath: SVGPathElement | null = null;

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      this.#defaultValue = this.getAttribute('value') ?? this.value;
      this.#defaultCaptured = true;
    }
    super.connectedCallback();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#shapeObserver?.disconnect();
    this.#shapeObserver = null;
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.#passwordVisible = false;
    this.value = this.#defaultValue;
    if (this.#input) {
      this.#input.value = this.#defaultValue;
      this.#syncFormAndValidity();
    }
  }

  /** Selects all text in the input. */
  select(): void {
    this.#input?.select();
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLDivElement;
    this.#input = this.renderRoot.querySelector('.input') as HTMLInputElement;
    this.#clearBtn = this.renderRoot.querySelector('.clear-btn') as HTMLButtonElement;
    this.#passwordBtn = this.renderRoot.querySelector('.password-btn') as HTMLButtonElement;

    this.#clearBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('close') ?? ''}</svg>`;
    this.#renderPasswordIcon();

    this.#base.addEventListener('mousedown', (event) => {
      if (event.target !== this.#input && !this.isDisabled) {
        event.preventDefault();
        this.#input.focus();
      }
    });

    this.#input.addEventListener('input', () => {
      this.value = this.#input.value;
      this.markInteracted();
      this.#syncFormAndValidity();
      this.#syncActionButtons();
    });

    this.#input.addEventListener('change', () => {
      this.value = this.#input.value;
      this.markInteracted();
      this.#syncFormAndValidity();
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    });

    this.#clearBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (this.isDisabled || this.readonly) return;
      this.value = '';
      this.#input.value = '';
      this.markInteracted();
      this.#syncFormAndValidity();
      this.#syncActionButtons();
      emit(this, 'k-clear');
      this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      this.#input.focus();
    });

    this.#passwordBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (this.isDisabled) return;
      this.#passwordVisible = !this.#passwordVisible;
      this.#renderPasswordIcon();
      this.#input.focus();
    });

    for (const slot of this.renderRoot.querySelectorAll<HTMLSlotElement>('slot[name]')) {
      const sync = (): void => {
        slot.parentElement?.classList.toggle('has-content', slot.assignedNodes().length > 0);
      };
      slot.addEventListener('slotchange', sync);
      sync();
    }
  }

  protected override update(changed: PropertyValues): void {
    const effectiveType =
      this.type === 'password' && this.#passwordVisible ? 'text' : this.type || 'text';
    if (this.#input.type !== effectiveType) this.#input.type = effectiveType;

    if (this.#input.value !== this.value) {
      this.#input.value = this.value;
    }

    this.#input.placeholder = this.placeholder;
    this.#input.disabled = this.isDisabled;
    this.#input.readOnly = this.readonly;
    this.#input.required = this.required;
    this.#base.classList.toggle('disabled', this.isDisabled);

    this.#syncAttr('minlength', this.minLength);
    this.#syncAttr('maxlength', this.maxLength);
    this.#syncAttr('min', this.min || null);
    this.#syncAttr('max', this.max || null);
    this.#syncAttr('step', this.step || null);
    this.#syncAttr('pattern', this.pattern || null);
    this.#syncAttr('autocomplete', this.autocomplete || null);

    this.#syncActionButtons();
    this.#syncFormAndValidity();

    if (changed.has('shape') || changed.has('size')) {
      this.#syncShapeMode();
    }
  }

  #syncAttr(attr: string, value: string | number | null): void {
    if (value === null || value === '' || (typeof value === 'number' && !Number.isFinite(value))) {
      this.#input.removeAttribute(attr);
    } else {
      this.#input.setAttribute(attr, String(value));
    }
  }

  #syncActionButtons(): void {
    const canClear = this.clearable && !this.isDisabled && !this.readonly && this.value.length > 0;
    this.#clearBtn.hidden = !canClear;
    const canTogglePassword = this.type === 'password' && this.passwordToggle && !this.isDisabled;
    this.#passwordBtn.hidden = !canTogglePassword;
  }

  #renderPasswordIcon(): void {
    const iconName = this.#passwordVisible ? 'eye-off' : 'eye';
    this.#passwordBtn.setAttribute(
      'aria-label',
      this.#passwordVisible ? 'Hide password' : 'Show password',
    );
    this.#passwordBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon(iconName) ?? ''}</svg>`;
  }

  #syncFormAndValidity(): void {
    this.setFormValue(this.value);
    const v = this.#input.validity;
    const tooShort =
      v.tooShort ||
      (this.minLength !== null &&
        this.minLength > 0 &&
        this.value.length > 0 &&
        this.value.length < this.minLength);
    const tooLong =
      v.tooLong ||
      (this.maxLength !== null &&
        this.maxLength >= 0 &&
        this.value.length > 0 &&
        this.value.length > this.maxLength);

    const flags: ValidityStateFlags = {
      valueMissing: v.valueMissing,
      typeMismatch: v.typeMismatch,
      patternMismatch: v.patternMismatch,
      tooLong,
      tooShort,
      rangeUnderflow: v.rangeUnderflow,
      rangeOverflow: v.rangeOverflow,
      stepMismatch: v.stepMismatch,
      badInput: v.badInput,
    };
    const message =
      this.#input.validationMessage ||
      (tooShort ? `Please lengthen this text to ${this.minLength} characters or more.` : '') ||
      (tooLong ? `Please shorten this text to ${this.maxLength} characters or less.` : '');
    this.setValidity(flags, message, this.#input);
  }

  #syncShapeMode(): void {
    const kind = isCornerKind(this.shape) ? this.shape : 'rounded';
    if (kind === 'rounded') {
      this.#shapeObserver?.disconnect();
      this.#shapeObserver = null;
      this.#base.style.clipPath = '';
      this.#shapeSvg?.remove();
      this.#shapeSvg = null;
      this.#shapePath = null;
      return;
    }

    if (!this.#shapeSvg) {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', 'shape-stroke');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(SVG_NS, 'path');
      svg.append(path);
      this.#base.prepend(svg);
      this.#shapeSvg = svg;
      this.#shapePath = path;
    }

    if (typeof ResizeObserver === 'function' && !this.#shapeObserver) {
      this.#shapeObserver = new ResizeObserver(() => this.#applyCustomShape());
      this.#shapeObserver.observe(this.#base);
    }

    this.#applyCustomShape();
  }

  #applyCustomShape(): void {
    const kind = isCornerKind(this.shape) ? this.shape : 'rounded';
    if (kind === 'rounded') return;
    const rect = this.#base.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;

    const rawRadius = Number.parseFloat(getComputedStyle(this.#base).borderTopLeftRadius);
    const radius = Number.isFinite(rawRadius) && rawRadius > 0 ? rawRadius : 6;
    const spec = { kind, radius };

    this.#base.style.clipPath = toClipPath(w, h, spec);
    this.#shapePath?.setAttribute('d', toSvgPath(w, h, spec, 0.5));
  }
}
