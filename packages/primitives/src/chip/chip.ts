import {
  AriaForwardingController,
  FormAssociatedElement,
  emit,
  prop,
  type PropertyValues,
} from '@kerno/core';
import { getIcon } from '../icon/registry.js';
import { chipGroupStyles, chipStyles } from './chip.styles.js';

export type ChipVariant = 'outline' | 'filled' | 'light';
export type ChipSize = 'sm' | 'md' | 'lg';

export interface ChipChangeDetail {
  value: string;
  values: string[];
}

/**
 * Selectable pill/tag toggle functioning either standalone (checkbox) or
 * coordinated inside `<k-chip-group>` (single radio or multiple checkbox).
 *
 * @tag k-chip
 *
 * @slot - Chip label text.
 * @csspart chip - Interactive toggle button.
 * @fires k-chip-toggle - Fired when checked state changes (`{ checked, value }`).
 */
export class KChip extends FormAssociatedElement {
  static override styles = chipStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<button part="chip" class="chip" type="button" role="checkbox" aria-checked="false"><span class="check" aria-hidden="true"></span><span class="label"><slot></slot></span></button>`;

  @prop({ type: Boolean, reflect: true }) accessor checked = false;
  @prop({ reflect: true }) accessor value = 'on';
  @prop({ reflect: true }) accessor variant: ChipVariant = 'outline';
  @prop({ reflect: true }) accessor size: ChipSize = 'md';
  @prop({ type: Boolean, reflect: true }) accessor pill = false;

  #button!: HTMLButtonElement;
  #checkEl!: HTMLSpanElement;
  #defaultChecked = false;
  #defaultCaptured = false;
  #explicitVariant = false;
  #explicitSize = false;
  #explicitPill = false;
  #inGroup = false;
  #groupRole: 'checkbox' | 'radio' = 'checkbox';

  constructor() {
    super();
    // Forward host aria-label / aria-labelledby / aria-describedby to the inner button.
    new AriaForwardingController(this, { getTarget: () => this.#button });
  }

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      this.#defaultChecked = this.hasAttribute('checked') || this.checked;
      this.#explicitVariant = this.hasAttribute('variant');
      this.#explicitSize = this.hasAttribute('size');
      this.#explicitPill = this.hasAttribute('pill');
      this.#defaultCaptured = true;
    }
    super.connectedCallback();
    emit(this, 'k-chip-connect', { chip: this });
  }

  override formResetCallback(): void {
    super.formResetCallback();
    if (this.#inGroup) return;
    this.checked = this.#defaultChecked;
    this.#syncFormAndValidity();
  }

  /** Called by parent `<k-chip-group>` to synchronize group presentation. */
  setGroupConfig(config: {
    inGroup: boolean;
    role: 'checkbox' | 'radio';
    variant: ChipVariant;
    size: ChipSize;
    pill: boolean;
    disabled: boolean;
  }): void {
    this.#inGroup = config.inGroup;
    this.#groupRole = config.role;
    if (!this.#explicitVariant) this.variant = config.variant;
    if (!this.#explicitSize) this.size = config.size;
    if (!this.#explicitPill) this.pill = config.pill;
    if (config.disabled && !this.disabled) {
      this.#button.disabled = true;
    } else if (this.#button) {
      this.#button.disabled = this.isDisabled;
    }
    if (this.#button) {
      this.#button.setAttribute('role', this.#groupRole);
    }
    this.#syncFormAndValidity();
  }

  protected override setup(): void {
    this.#button = this.renderRoot.querySelector('.chip') as HTMLButtonElement;
    this.#checkEl = this.renderRoot.querySelector('.check') as HTMLSpanElement;
    this.#checkEl.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('check') ?? ''}</svg>`;

    this.#button.addEventListener('click', () => {
      if (this.isDisabled || this.#button.disabled) return;
      if (this.#inGroup) {
        emit(this, 'k-chip-request-toggle', { chip: this, value: this.value });
        return;
      }
      this.checked = !this.checked;
      this.markInteracted();
      this.#syncFormAndValidity();
      emit(this, 'k-chip-toggle', { checked: this.checked, value: this.value });
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    });
  }

  protected override update(_changed: PropertyValues): void {
    this.#button.disabled = this.isDisabled;
    this.#button.setAttribute('role', this.#groupRole);
    this.#button.setAttribute('aria-checked', this.checked ? 'true' : 'false');
    this.#syncFormAndValidity();
  }

  #syncFormAndValidity(): void {
    if (this.#inGroup) {
      this.setFormValue(null);
      this.setValidity({});
      return;
    }
    this.setFormValue(this.isDisabled || !this.checked ? null : this.value || 'on');
    if (this.isDisabled) {
      this.setValidity({});
      return;
    }
    if (this.required && !this.checked) {
      this.setValidity({ valueMissing: true }, this.localize.term('chipRequired'), this.#button);
      return;
    }
    this.setValidity({});
  }
}

/**
 * Form-associated group coordinating single (`radio`) or multiple (`checkbox`)
 * `<k-chip>` selections with unified variant, size, pill styling, and `FormData`.
 *
 * @tag k-chip-group
 *
 * @slot - `<k-chip>` elements.
 * @fires k-chip-change - Fired when group selection changes (`{ value, values }`).
 */
export class KChipGroup extends FormAssociatedElement {
  static override styles = chipGroupStyles;
  static override template = /* html */ `<slot></slot>`;

  @prop({ type: Boolean, reflect: true }) accessor multiple = false;
  /** Selected value (single mode) or comma-joined values (multiple mode). */
  @prop({ reflect: true }) accessor value = '';
  @prop({ reflect: true }) accessor variant: ChipVariant = 'filled';
  @prop({ reflect: true }) accessor size: ChipSize = 'md';
  @prop({ type: Boolean, reflect: true }) accessor pill = false;
  @prop({ reflect: true }) accessor label = '';

  #slot!: HTMLSlotElement;
  #selected: string[] = [];
  #defaultValue = '';
  #defaultCaptured = false;
  #autoAriaLabel: string | null = null;

  get values(): string[] {
    return [...this.#selected];
  }

  set values(next: string[]) {
    const clean = [...new Set(next.map((s) => s.trim()).filter(Boolean))];
    this.#selected = this.multiple ? clean : clean.slice(0, 1);
    this.value = this.#selected.join(',');
    this.#syncChips();
    this.#syncFormAndValidity();
  }

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      this.#defaultValue = this.getAttribute('value') ?? this.value;
      this.#defaultCaptured = true;
    }
    super.connectedCallback();
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.value = this.#defaultValue;
    this.#syncSelectedFromValue();
    this.#syncChips();
    this.#syncFormAndValidity();
  }

  protected override setup(): void {
    this.#slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;
    this.#slot.addEventListener('slotchange', () => this.#syncChips());
    this.addEventListener('k-chip-connect', (e) => {
      e.stopPropagation();
      this.#syncChips();
    });
    this.addEventListener('k-chip-request-toggle', (e) => {
      e.stopPropagation();
      if (this.isDisabled) return;
      const { value } = (e as CustomEvent<{ chip: KChip; value: string }>).detail;
      this.#toggleValue(value);
    });
  }

  protected override update(changed: PropertyValues): void {
    if (changed.has('value') || changed.has('multiple')) {
      this.#syncSelectedFromValue();
    }
    this.setAttribute('role', this.multiple ? 'group' : 'radiogroup');
    this.#syncAriaLabel();
    this.#syncChips();
    this.#syncFormAndValidity();
  }

  #syncAriaLabel(): void {
    if (this.hasAttribute('aria-labelledby')) {
      if (this.#autoAriaLabel !== null && this.getAttribute('aria-label') === this.#autoAriaLabel) {
        this.removeAttribute('aria-label');
      }
      this.#autoAriaLabel = null;
      return;
    }
    const desired = this.label || this.localize.term('chipOptions');
    const current = this.getAttribute('aria-label');
    if (this.label || current === null || current === this.#autoAriaLabel) {
      if (current !== desired) this.setAttribute('aria-label', desired);
      this.#autoAriaLabel = this.label ? null : desired;
    }
  }

  #chips(): KChip[] {
    return this.#slot
      .assignedElements({ flatten: true })
      .filter((el): el is KChip => el instanceof KChip);
  }

  #syncSelectedFromValue(): void {
    const raw = this.value
      ? this.value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const dedup = [...new Set(raw)];
    this.#selected = this.multiple ? dedup : dedup.slice(0, 1);
  }

  #syncChips(): void {
    const role: 'checkbox' | 'radio' = this.multiple ? 'checkbox' : 'radio';
    for (const chip of this.#chips()) {
      chip.setGroupConfig({
        inGroup: true,
        role,
        variant: this.variant,
        size: this.size,
        pill: this.pill,
        disabled: this.isDisabled,
      });
      chip.checked = this.#selected.includes(chip.value);
    }
  }

  #toggleValue(val: string): void {
    const prev = this.value;
    if (this.multiple) {
      const idx = this.#selected.indexOf(val);
      if (idx !== -1) this.#selected.splice(idx, 1);
      else this.#selected.push(val);
    } else {
      this.#selected = [val];
    }

    this.value = this.#selected.join(',');
    this.#syncChips();
    this.markInteracted();
    this.#syncFormAndValidity();

    if (this.value !== prev) {
      emit<ChipChangeDetail>(this, 'k-chip-change', {
        value: this.value,
        values: [...this.#selected],
      });
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }

  #syncFormAndValidity(): void {
    if (this.isDisabled || this.#selected.length === 0) {
      this.setFormValue(null);
    } else if (this.multiple && this.name) {
      const fd = new FormData();
      for (const v of this.#selected) fd.append(this.name, v);
      this.setFormValue(fd);
    } else {
      this.setFormValue(this.value);
    }

    if (this.isDisabled) {
      this.setValidity({});
      return;
    }
    if (this.required && this.#selected.length === 0) {
      this.setValidity(
        { valueMissing: true },
        this.localize.term('optionsRequired'),
        this.#chips()[0],
      );
      return;
    }
    this.setValidity({});
  }
}
