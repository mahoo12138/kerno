import { FormAssociatedElement, emit, prop, type PropertyValues } from '@kerno/core';
import { pinInputStyles } from './pin-input.styles.js';

export type PinInputType = 'number' | 'alphanumeric';
export type PinInputSize = 'sm' | 'md' | 'lg';

export interface PinCompleteDetail {
  value: string;
}

/**
 * Form-associated multi-cell OTP / PIN verification input with automatic focus
 * advance, Backspace retreat, smart paste distribution, and optional masking.
 *
 * @tag k-pin-input
 *
 * @csspart group - Container wrapping the PIN input cells.
 * @csspart cell - Individual character input box.
 *
 * @fires k-complete - Fired when every cell is filled (`{ value }`).
 * @fires input - Fired whenever any character changes.
 * @fires change - Fired when value updates.
 */
export class KPinInput extends FormAssociatedElement {
  static override styles = pinInputStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div part="group" class="group" role="group"></div>`;

  @prop({ reflect: true }) accessor value = '';
  @prop({ type: Number, reflect: true }) accessor length = 6;
  @prop({ reflect: true }) accessor type: PinInputType = 'number';
  @prop({ type: Boolean, reflect: true }) accessor mask = false;
  @prop({ type: Boolean, attribute: 'one-time-code', reflect: true }) accessor oneTimeCode = false;
  @prop({ reflect: true }) accessor placeholder = '○';
  @prop({ reflect: true }) accessor size: PinInputSize = 'md';
  @prop({ type: Boolean, reflect: true }) accessor readonly = false;
  @prop({ reflect: true }) accessor label = 'Verification code';

  #group!: HTMLDivElement;
  #cells: HTMLInputElement[] = [];
  #chars: string[] = [];
  #defaultValue = '';
  #defaultCaptured = false;

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      this.#defaultValue = this.getAttribute('value') ?? this.value;
      this.#defaultCaptured = true;
    }
    super.connectedCallback();
  }

  override focus(options?: FocusOptions): void {
    const idx = this.#chars.findIndex((c) => !c);
    const target = this.#cells[idx === -1 ? Math.max(0, this.#cells.length - 1) : idx];
    target?.focus(options);
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.value = this.#defaultValue;
    this.#syncCharsFromValue();
    this.#syncCellDOM();
    this.#syncFormAndValidity();
  }

  protected override setup(): void {
    this.#group = this.renderRoot.querySelector('.group') as HTMLDivElement;
  }

  protected override update(changed: PropertyValues): void {
    const count = this.#normalizedLength();
    this.#group.setAttribute('aria-label', this.label || 'Verification code');

    if (changed.has('length') || this.#cells.length !== count) {
      this.#rebuildCells(count);
    }

    if (changed.has('value') || changed.has('type') || changed.has('length')) {
      this.#syncCharsFromValue();
    }

    this.#syncCellDOM();
    this.#syncFormAndValidity();
  }

  #normalizedLength(): number {
    return Math.max(1, Math.min(16, Math.floor(this.length) || 6));
  }

  #sanitize(raw: string): string {
    const pattern = this.type === 'number' ? /[^0-9]/g : /[^0-9a-zA-Z]/g;
    return raw.replace(pattern, '');
  }

  #syncCharsFromValue(): void {
    const count = this.#normalizedLength();
    const clean = this.#sanitize(this.value).slice(0, count);
    this.#chars = Array.from({ length: count }, (_, i) => clean[i] ?? '');
    if (clean !== this.value) {
      this.value = clean;
    }
  }

  #rebuildCells(count: number): void {
    this.#group.innerHTML = '';
    this.#cells = [];
    for (let i = 0; i < count; i++) {
      const input = document.createElement('input');
      input.className = 'cell';
      input.setAttribute('part', 'cell');
      input.setAttribute('aria-label', `${this.label || 'PIN'} character ${i + 1} of ${count}`);

      input.addEventListener('focus', () => {
        input.select();
      });

      input.addEventListener('input', () => {
        if (this.isDisabled || this.readonly) {
          input.value = this.#chars[i] ?? '';
          return;
        }
        const cleaned = this.#sanitize(input.value);
        if (!cleaned) {
          input.value = '';
          this.#setCharAt(i, '');
          return;
        }
        if (cleaned.length > 1) {
          if (
            i === this.#cells.length - 1 &&
            this.#chars[i] &&
            cleaned.length === 2 &&
            cleaned[0] === this.#chars[i]
          ) {
            this.#setCharAt(i, cleaned[1]!);
            return;
          }
          this.#distributeFrom(i, cleaned);
          return;
        }
        this.#setCharAt(i, cleaned[0]!);
        if (i + 1 < this.#cells.length) {
          this.#cells[i + 1]?.focus();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (this.isDisabled) return;
        if (e.key === 'Backspace') {
          if (this.readonly) return;
          e.preventDefault();
          if (this.#chars[i]) {
            this.#setCharAt(i, '');
          } else if (i > 0) {
            this.#setCharAt(i - 1, '');
            this.#cells[i - 1]?.focus();
          }
          return;
        }
        if (e.key === 'Delete') {
          if (this.readonly) return;
          e.preventDefault();
          this.#setCharAt(i, '');
          return;
        }
        if (e.key === 'ArrowLeft' && i > 0) {
          e.preventDefault();
          this.#cells[i - 1]?.focus();
        } else if (e.key === 'ArrowRight' && i + 1 < this.#cells.length) {
          e.preventDefault();
          this.#cells[i + 1]?.focus();
        } else if (e.key === 'Home') {
          e.preventDefault();
          this.#cells[0]?.focus();
        } else if (e.key === 'End') {
          e.preventDefault();
          this.#cells[this.#cells.length - 1]?.focus();
        }
      });

      input.addEventListener('paste', (e) => {
        if (this.isDisabled || this.readonly) return;
        const text = e.clipboardData?.getData('text') ?? '';
        const cleaned = this.#sanitize(text);
        if (!cleaned) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        this.#distributeFrom(i, cleaned);
      });

      this.#cells.push(input);
      this.#group.append(input);
    }
  }

  #syncCellDOM(): void {
    const disabled = this.isDisabled;
    const inputType = this.mask ? 'password' : 'text';
    const inputMode = this.type === 'number' ? 'numeric' : 'text';
    this.#cells.forEach((cell, i) => {
      const ch = this.#chars[i] ?? '';
      if (cell.type !== inputType) cell.type = inputType;
      cell.inputMode = inputMode;
      cell.autocomplete = this.oneTimeCode && i === 0 ? 'one-time-code' : 'off';
      cell.placeholder = this.placeholder;
      cell.disabled = disabled;
      cell.readOnly = this.readonly;
      if (cell.value !== ch) cell.value = ch;
      cell.classList.toggle('filled', ch.length > 0);
    });
  }

  #setCharAt(index: number, ch: string): void {
    const prev = this.#chars.join('');
    this.#chars[index] = ch;
    this.#commitChars(prev);
  }

  #distributeFrom(startIndex: number, text: string): void {
    const prev = this.#chars.join('');
    let idx = startIndex;
    for (const ch of text) {
      if (idx >= this.#cells.length) break;
      this.#chars[idx] = ch;
      idx++;
    }
    this.#commitChars(prev);
    const focusIdx = Math.min(idx, this.#cells.length - 1);
    this.#cells[focusIdx]?.focus();
  }

  #commitChars(prevValue: string): void {
    const next = this.#chars.join('');
    this.value = next;
    this.#syncCellDOM();
    this.markInteracted();
    this.#syncFormAndValidity();

    if (next !== prevValue) {
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      const full = this.#chars.every((c) => c.length === 1);
      if (full && next.length === this.#normalizedLength()) {
        emit<PinCompleteDetail>(this, 'k-complete', { value: next });
      }
    }
  }

  #syncFormAndValidity(): void {
    const count = this.#normalizedLength();
    this.setFormValue(this.isDisabled || !this.value ? null : this.value);
    if (this.isDisabled) {
      this.setValidity({});
      return;
    }
    if (this.required && this.value.length < count) {
      this.setValidity(
        { valueMissing: true },
        `Please enter all ${count} characters.`,
        this.#cells[0],
      );
      return;
    }
    this.setValidity({});
  }
}
