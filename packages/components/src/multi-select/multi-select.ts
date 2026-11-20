import {
  FormAssociatedElement,
  autoPosition,
  emit,
  enterTopLayer,
  exitTopLayer,
  overlayManager,
  prop,
  uniqueId,
  type PropertyValues,
} from '@kerno/core';
import { fadeOut, slideIn, type MotionHandle } from '@kerno/effects/motion';
import { ShapeOutlineController, type CornerKind } from '@kerno/effects/shape';
import { getIcon } from '@kerno/primitives/icon';
import { multiSelectStyles } from './multi-select.styles.js';

export type MultiSelectSize = 'sm' | 'md' | 'lg';

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MultiSelectChangeDetail {
  values: string[];
  options: MultiSelectOption[];
}

/**
 * Form-associated searchable multi-select Combobox rendering removable chips
 * inside the field and a Top-Layer Acrylic multi-selectable checkbox listbox.
 *
 * @tag k-multi-select
 *
 * @slot - Optional `<k-option>` or `<option>` items when `options` prop is empty.
 *
 * @csspart control - Outer combobox container.
 * @csspart pill - Individual selected value chip.
 * @csspart panel - Top-Layer multi-selectable listbox popover.
 *
 * @fires k-multi-select-change - Fired whenever selected values change (`{ values, options }`).
 * @fires input - Fired on selection change.
 * @fires change - Fired when selection commits.
 */
export class KMultiSelect extends FormAssociatedElement {
  static override styles = multiSelectStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div part="control" class="control"><div class="pills"><input class="search" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" autocomplete="off" /></div><span class="trailing"><button class="clear-btn" type="button" aria-label="Clear selection" hidden></button><span class="arrow" aria-hidden="true"></span></span></div><div part="panel" class="panel" role="listbox" aria-multiselectable="true"></div><slot class="source-slot"></slot>`;

  @prop({ attribute: false }) accessor options: readonly MultiSelectOption[] = [];
  /** Comma-joined selected values string. */
  @prop({ reflect: true }) accessor value = '';
  @prop({ reflect: true }) accessor placeholder = 'Select options...';
  @prop({ type: Boolean, reflect: true }) accessor searchable = true;
  @prop({ type: Number, attribute: 'max-values', reflect: true }) accessor maxValues = Infinity;
  @prop({ type: Boolean, attribute: 'hide-picked-options', reflect: true })
  accessor hidePickedOptions = false;
  @prop({ reflect: true }) accessor size: MultiSelectSize = 'md';
  @prop({ reflect: true }) accessor shape: CornerKind = 'rounded';
  @prop({ type: Boolean, reflect: true }) accessor clearable = false;
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;
  @prop({ type: Boolean, reflect: true }) accessor readonly = false;
  @prop({ type: Boolean, reflect: true }) accessor open = false;
  @prop({ reflect: true, attribute: 'empty-text' }) accessor emptyText = 'No matching options.';

  readonly #overlayId = uniqueId('k-multiselect');

  #control!: HTMLDivElement;
  #pills!: HTMLDivElement;
  #search!: HTMLInputElement;
  #clearBtn!: HTMLButtonElement;
  #arrow!: HTMLSpanElement;
  #panel!: HTMLDivElement;
  #sourceSlot!: HTMLSlotElement;

  #selected: string[] = [];
  #visibleOptions: MultiSelectOption[] = [];
  #activeIndex = 0;
  #wasOpen = false;
  #stopPosition: (() => void) | null = null;
  #exitAnim: MotionHandle | null = null;
  #defaultValue = '';
  #defaultCaptured = false;

  readonly #shapeOutline = new ShapeOutlineController(this, {
    getTarget: () => this.#control ?? null,
    getKind: () => this.shape,
  });

  get values(): string[] {
    return [...this.#selected];
  }

  set values(next: string[]) {
    const clean: string[] = [];
    for (const v of next) {
      if (!v || clean.includes(v)) continue;
      if (clean.length >= this.maxValues) break;
      clean.push(v);
    }
    this.#selected = clean;
    this.value = clean.join(',');
    this.#renderPills();
    if (this.open) this.#renderOptions();
    this.#syncFormAndValidity();
  }

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      this.#defaultValue = this.getAttribute('value') ?? this.value;
      this.#defaultCaptured = true;
    }
    super.connectedCallback();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cleanupOverlay();
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.value = this.#defaultValue;
    this.#syncSelectedFromValue();
    this.#search.value = '';
    this.#renderPills();
    this.#syncFormAndValidity();
  }

  protected override setup(): void {
    this.#control = this.renderRoot.querySelector('.control') as HTMLDivElement;
    this.#pills = this.renderRoot.querySelector('.pills') as HTMLDivElement;
    this.#search = this.renderRoot.querySelector('.search') as HTMLInputElement;
    this.#clearBtn = this.renderRoot.querySelector('.clear-btn') as HTMLButtonElement;
    this.#arrow = this.renderRoot.querySelector('.arrow') as HTMLSpanElement;
    this.#panel = this.renderRoot.querySelector('.panel') as HTMLDivElement;
    this.#sourceSlot = this.renderRoot.querySelector('.source-slot') as HTMLSlotElement;

    this.#clearBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('close') ?? ''}</svg>`;
    this.#arrow.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('chevron-down') ?? ''}</svg>`;

    this.#control.addEventListener('click', (e) => {
      if (this.isDisabled || this.readonly) return;
      if ((e.target as HTMLElement).closest('button')) return;
      this.#search.focus();
      if (!this.open) this.open = true;
    });

    this.#clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isDisabled || this.readonly) return;
      this.#selected = [];
      this.#search.value = '';
      this.#commitSelection();
    });

    this.#search.addEventListener('input', () => {
      if (this.isDisabled || this.readonly) return;
      if (!this.open) this.open = true;
      this.#activeIndex = 0;
      this.#renderOptions();
    });

    this.#search.addEventListener('keydown', (e) => {
      if (this.isDisabled || this.readonly) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!this.open) {
          this.open = true;
          return;
        }
        if (this.#visibleOptions.length > 0) {
          this.#activeIndex = (this.#activeIndex + 1) % this.#visibleOptions.length;
          this.#renderOptions();
        }
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!this.open) {
          this.open = true;
          return;
        }
        if (this.#visibleOptions.length > 0) {
          this.#activeIndex =
            (this.#activeIndex - 1 + this.#visibleOptions.length) % this.#visibleOptions.length;
          this.#renderOptions();
        }
        return;
      }
      if (e.key === 'Enter') {
        if (!this.open) {
          e.preventDefault();
          this.open = true;
          return;
        }
        const opt = this.#visibleOptions[this.#activeIndex];
        if (opt && !this.#isOptionDisabled(opt)) {
          e.preventDefault();
          this.#toggleValue(opt.value);
        }
        return;
      }
      if (e.key === 'Backspace' && this.#search.value === '' && this.#selected.length > 0) {
        e.preventDefault();
        this.#selected.pop();
        this.#commitSelection();
        return;
      }
      if (e.key === 'Escape' && this.open) {
        e.preventDefault();
        this.open = false;
      }
    });

    this.#sourceSlot.addEventListener('slotchange', () => {
      this.#renderPills();
      if (this.open) this.#renderOptions();
    });
  }

  protected override update(changed: PropertyValues): void {
    if (changed.has('value')) {
      this.#syncSelectedFromValue();
    }

    const disabled = this.isDisabled;
    this.#control.classList.toggle('disabled', disabled);
    this.#search.disabled = disabled;
    this.#search.readOnly = !this.searchable || this.readonly;
    this.#search.setAttribute('aria-expanded', this.open ? 'true' : 'false');
    this.#search.placeholder = this.#selected.length === 0 ? this.placeholder : '';
    this.#clearBtn.hidden =
      !this.clearable || disabled || this.readonly || this.#selected.length === 0;

    this.#renderPills();
    this.#syncFormAndValidity();
    this.#shapeOutline.sync();

    if (this.open && !this.#wasOpen && !disabled && !this.readonly) {
      this.#openOverlay();
    } else if ((!this.open || disabled || this.readonly) && this.#wasOpen) {
      this.#closeOverlay();
    } else if (this.open) {
      this.#renderOptions();
    }
    this.#wasOpen = this.open && !disabled && !this.readonly;
  }

  #syncSelectedFromValue(): void {
    const raw = this.value
      ? this.value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const next: string[] = [];
    for (const v of raw) {
      if (next.includes(v)) continue;
      if (next.length >= this.maxValues) break;
      next.push(v);
    }
    this.#selected = next;
  }

  #allOptions(): MultiSelectOption[] {
    if (this.options.length > 0) return [...this.options];
    return this.#sourceSlot
      .assignedElements({ flatten: true })
      .filter((el) => {
        const tag = el.tagName.toLowerCase();
        return tag === 'k-option' || tag === 'option';
      })
      .map((el) => {
        const val = el.getAttribute('value') ?? el.textContent?.trim() ?? '';
        return {
          value: val,
          label: el.textContent?.trim() || val,
          disabled: el.hasAttribute('disabled'),
        };
      });
  }

  #isOptionDisabled(opt: MultiSelectOption): boolean {
    if (opt.disabled) return true;
    const picked = this.#selected.includes(opt.value);
    return !picked && this.#selected.length >= this.maxValues;
  }

  #renderPills(): void {
    for (const existing of this.#pills.querySelectorAll('.pill')) existing.remove();
    const optionMap = new Map(this.#allOptions().map((o) => [o.value, o.label]));
    const closeSvg = getIcon('close') ?? '';
    const locked = this.isDisabled || this.readonly;

    for (const val of this.#selected) {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.setAttribute('part', 'pill');

      const lbl = document.createElement('span');
      lbl.className = 'pill-label';
      lbl.textContent = optionMap.get(val) ?? val;
      pill.append(lbl);

      if (!locked) {
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'pill-remove';
        rm.setAttribute('aria-label', `Remove ${optionMap.get(val) ?? val}`);
        rm.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${closeSvg}</svg>`;
        rm.addEventListener('click', (e) => {
          e.stopPropagation();
          this.#toggleValue(val);
        });
        pill.append(rm);
      }

      this.#pills.insertBefore(pill, this.#search);
    }
  }

  #renderOptions(): void {
    const q = this.#search.value.trim().toLowerCase();
    const all = this.#allOptions();
    this.#visibleOptions = all.filter((opt) => {
      if (this.hidePickedOptions && this.#selected.includes(opt.value)) return false;
      if (!q) return true;
      return opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q);
    });

    if (this.#activeIndex >= this.#visibleOptions.length) {
      this.#activeIndex = Math.max(0, this.#visibleOptions.length - 1);
    }

    this.#panel.innerHTML = '';
    if (this.#visibleOptions.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = this.emptyText;
      this.#panel.append(empty);
      return;
    }

    const checkSvg = getIcon('check') ?? '';
    this.#visibleOptions.forEach((opt, idx) => {
      const selected = this.#selected.includes(opt.value);
      const disabled = this.#isOptionDisabled(opt);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
      btn.dataset.value = opt.value;
      btn.disabled = disabled;
      btn.classList.toggle('active', idx === this.#activeIndex);

      const box = document.createElement('span');
      box.className = 'box';
      box.setAttribute('aria-hidden', 'true');
      box.innerHTML = `<svg viewBox="0 0 16 16">${checkSvg}</svg>`;

      const text = document.createElement('span');
      text.textContent = opt.label;

      btn.append(box, text);
      btn.addEventListener('pointerdown', (e) => e.preventDefault());
      btn.addEventListener('click', () => {
        if (!disabled) this.#toggleValue(opt.value);
      });
      this.#panel.append(btn);
    });
  }

  #toggleValue(val: string): void {
    const idx = this.#selected.indexOf(val);
    if (idx !== -1) {
      this.#selected.splice(idx, 1);
    } else {
      if (this.#selected.length >= this.maxValues) return;
      this.#selected.push(val);
    }
    this.#search.value = '';
    this.#commitSelection();
    if (this.open) this.#renderOptions();
  }

  #commitSelection(): void {
    this.value = this.#selected.join(',');
    this.#renderPills();
    this.markInteracted();
    this.#syncFormAndValidity();
    this.#clearBtn.hidden =
      !this.clearable || this.isDisabled || this.readonly || this.#selected.length === 0;

    const all = this.#allOptions();
    const pickedOptions = this.#selected.map(
      (v) => all.find((o) => o.value === v) ?? { value: v, label: v },
    );

    emit<MultiSelectChangeDetail>(this, 'k-multi-select-change', {
      values: [...this.#selected],
      options: pickedOptions,
    });
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  #openOverlay(): void {
    if (this.#exitAnim) {
      this.#exitAnim.cancel();
      this.#exitAnim = null;
      this.#panel.classList.remove('closing');
    }
    this.#activeIndex = 0;
    this.#renderOptions();
    this.#panel.style.width = `${Math.max(220, this.#control.getBoundingClientRect().width)}px`;
    enterTopLayer(this.#panel);
    this.#stopPosition = autoPosition(this.#control, this.#panel, {
      placement: 'bottom-start',
      offset: 4,
    });
    overlayManager.add({
      id: this.#overlayId,
      content: this.#panel,
      trigger: this.#control,
      trapFocus: false,
      restoreFocus: false,
      closeOnEscape: true,
      closeOnOutsideClick: true,
      onRequestClose: () => {
        this.open = false;
      },
    });
    slideIn(this.#panel, { y: -4 }, { duration: 'fast' });
  }

  #closeOverlay(): void {
    overlayManager.remove(this.#overlayId, false);
    this.#stopPosition?.();
    this.#stopPosition = null;
    this.#panel.classList.add('closing');
    this.#exitAnim = fadeOut(this.#panel, { duration: 'fast' });
    void this.#exitAnim.finished.then(() => {
      if (this.open) return;
      this.#panel.classList.remove('closing');
      exitTopLayer(this.#panel);
      this.#exitAnim = null;
    });
  }

  #cleanupOverlay(): void {
    this.#exitAnim?.cancel();
    this.#exitAnim = null;
    this.#stopPosition?.();
    this.#stopPosition = null;
    exitTopLayer(this.#panel);
    overlayManager.remove(this.#overlayId, false);
    this.#wasOpen = false;
  }

  #syncFormAndValidity(): void {
    if (this.isDisabled || this.#selected.length === 0) {
      this.setFormValue(null);
    } else if (this.name) {
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
      this.setValidity({ valueMissing: true }, 'Please select at least one option.', this.#search);
      return;
    }
    this.setValidity({});
  }
}
