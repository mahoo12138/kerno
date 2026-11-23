import {
  AriaForwardingController,
  FormAssociatedElement,
  autoPosition,
  emit,
  enterTopLayer,
  exitTopLayer,
  isComposing,
  overlayManager,
  prop,
  setLabels,
  uniqueId,
  type PropertyValues,
} from '@kerno/core';
import { fadeOut, slideIn, type MotionHandle } from '@kerno/effects/motion';
import type { CornerKind } from '@kerno/effects/shape';
import { LazyShapeOutlineController } from '@kerno/effects/shape/lazy';
import { getIcon } from '@kerno/primitives/icon';
import { tagsInputStyles } from './tags-input.styles.js';

export type TagsInputSize = 'sm' | 'md' | 'lg';

export interface TagsChangeDetail {
  values: string[];
  value: string;
}

/**
 * Form-associated free-form tags input supporting delimiter splitting (Enter,
 * comma, paste), Backspace deletion, max-tags limit, duplicate guard, and
 * optional Top-Layer Acrylic suggestion list.
 *
 * @tag k-tags-input
 *
 * @slot - Optional `<k-option>` or `<option>` suggestions when `suggestions` prop is empty.
 *
 * @csspart control - Input frame containing pills and inline text field.
 * @csspart tag - Individual tag chip.
 * @csspart panel - Top-Layer suggestion popover.
 *
 * @fires k-tags-change - Fired whenever tags change (`{ values, value }`).
 * @fires k-tag-add - Fired when a tag is added (`{ tag }`).
 * @fires k-tag-remove - Fired when a tag is removed (`{ tag }`).
 * @fires input - Fired on tags change.
 * @fires change - Fired when tags change commits.
 */
export class KTagsInput extends FormAssociatedElement {
  static override styles = tagsInputStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div part="control" class="control"><div class="pills"><input class="input" type="text" autocomplete="off" /></div><button class="clear-btn" type="button" aria-label="Clear all tags" hidden></button></div><div part="panel" class="panel" role="listbox" aria-label="Tag suggestions"></div><slot class="source-slot"></slot>`;

  /** Comma-joined string representation of current tags. */
  @prop({ reflect: true }) accessor value = '';
  @prop({ attribute: false }) accessor suggestions: readonly string[] = [];
  @prop({ reflect: true }) accessor placeholder = '';
  @prop({ type: Number, attribute: 'max-tags', reflect: true }) accessor maxTags = Infinity;
  @prop({ type: Boolean, attribute: 'allow-duplicates', reflect: true })
  accessor allowDuplicates = false;
  @prop({ attribute: 'split-chars', reflect: true }) accessor splitChars = ',';
  @prop({ reflect: true }) accessor size: TagsInputSize = 'md';
  @prop({ reflect: true }) accessor shape: CornerKind = 'rounded';
  @prop({ type: Boolean, reflect: true }) accessor clearable = false;
  @prop({ type: Boolean, reflect: true }) accessor acrylic = false;
  @prop({ type: Boolean, reflect: true }) accessor readonly = false;
  @prop({ type: Boolean, reflect: true }) accessor open = false;

  readonly #overlayId = uniqueId('k-tags');

  #control!: HTMLDivElement;
  #pills!: HTMLDivElement;
  #input!: HTMLInputElement;
  #clearBtn!: HTMLButtonElement;
  #panel!: HTMLDivElement;
  #sourceSlot!: HTMLSlotElement;

  #tags: string[] = [];
  #filteredSuggestions: string[] = [];
  #activeIndex = -1;
  #wasOpen = false;
  #stopPosition: (() => void) | null = null;
  #exitAnim: MotionHandle | null = null;
  #defaultValue = '';
  #defaultCaptured = false;

  readonly #shapeOutline = new LazyShapeOutlineController(this, {
    getTarget: () => this.#control ?? null,
    getKind: () => this.shape,
  });

  constructor() {
    super();
    // Forward host aria-label / aria-labelledby / <label for> to the focused inner element.
    new AriaForwardingController(this, { getTarget: () => this.#input });
  }

  /** Array accessor for tags. */
  get values(): string[] {
    return [...this.#tags];
  }

  set values(next: string[]) {
    const clean: string[] = [];
    for (const raw of next) {
      const t = raw.trim();
      if (!t) continue;
      if (!this.allowDuplicates && clean.includes(t)) continue;
      if (clean.length >= this.maxTags) break;
      clean.push(t);
    }
    this.#tags = clean;
    this.value = clean.join(',');
    this.#renderTags();
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
    this.#syncTagsFromValue();
    this.#input.value = '';
    this.#renderTags();
    this.#syncFormAndValidity();
  }

  protected override setup(): void {
    this.#control = this.renderRoot.querySelector('.control') as HTMLDivElement;
    this.#pills = this.renderRoot.querySelector('.pills') as HTMLDivElement;
    this.#input = this.renderRoot.querySelector('.input') as HTMLInputElement;
    this.#clearBtn = this.renderRoot.querySelector('.clear-btn') as HTMLButtonElement;
    this.#panel = this.renderRoot.querySelector('.panel') as HTMLDivElement;
    this.#sourceSlot = this.renderRoot.querySelector('.source-slot') as HTMLSlotElement;

    this.#clearBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('close') ?? ''}</svg>`;

    this.#control.addEventListener('click', (e) => {
      if (this.isDisabled) return;
      if ((e.target as HTMLElement).closest('button')) return;
      this.#input.focus();
      this.#maybeOpenSuggestions();
    });

    this.#clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isDisabled || this.readonly) return;
      if (this.#tags.length === 0 && !this.#input.value) return;
      this.#tags = [];
      this.#input.value = '';
      this.#commitTags();
    });

    this.#input.addEventListener('focus', () => {
      if (!this.isDisabled && !this.readonly) {
        this.#maybeOpenSuggestions();
      }
    });

    const onText = (): void => {
      if (this.isDisabled || this.readonly) return;
      const splitSet = this.splitChars;
      if (splitSet && [...splitSet].some((ch) => this.#input.value.includes(ch))) {
        this.#consumeInputText(this.#input.value);
        return;
      }
      this.#refreshSuggestions();
    };
    this.#input.addEventListener('input', (e) => {
      // Don't split or filter mid-composition; `compositionend` delivers the committed text.
      if (!(e as InputEvent).isComposing) onText();
    });
    this.#input.addEventListener('compositionend', onText);

    this.#input.addEventListener('paste', (e) => {
      if (this.isDisabled || this.readonly) return;
      const text = e.clipboardData?.getData('text') ?? '';
      const splitSet = this.splitChars;
      if (text.includes('\n') || (splitSet && [...splitSet].some((ch) => text.includes(ch)))) {
        e.preventDefault();
        this.#consumeInputText(this.#input.value + text);
      }
    });

    this.#input.addEventListener('keydown', (e) => {
      if (this.isDisabled || this.readonly || isComposing(e)) return;
      if (e.key === 'ArrowDown' && this.#filteredSuggestions.length > 0) {
        e.preventDefault();
        if (!this.open) this.open = true;
        this.#activeIndex = (this.#activeIndex + 1) % this.#filteredSuggestions.length;
        this.#renderSuggestions();
        return;
      }
      if (e.key === 'ArrowUp' && this.#filteredSuggestions.length > 0) {
        e.preventDefault();
        if (!this.open) this.open = true;
        this.#activeIndex =
          this.#activeIndex <= 0 ? this.#filteredSuggestions.length - 1 : this.#activeIndex - 1;
        this.#renderSuggestions();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.open && this.#activeIndex >= 0 && this.#filteredSuggestions[this.#activeIndex]) {
          this.#addTag(this.#filteredSuggestions[this.#activeIndex]!);
          this.#input.value = '';
          this.#refreshSuggestions();
          return;
        }
        if (this.#input.value.trim()) {
          this.#addTag(this.#input.value);
          this.#input.value = '';
          this.#refreshSuggestions();
        }
        return;
      }
      if (e.key === 'Backspace' && this.#input.value === '' && this.#tags.length > 0) {
        e.preventDefault();
        this.#removeAt(this.#tags.length - 1);
        return;
      }
      if (e.key === 'Escape' && this.open) {
        e.preventDefault();
        this.open = false;
      }
    });

    this.#sourceSlot.addEventListener('slotchange', () => {
      this.#refreshSuggestions(false);
    });
  }

  protected override update(changed: PropertyValues): void {
    // Localized labels; re-applied whenever the language changes.
    setLabels(this.renderRoot, [
      ['.clear-btn', this.localize.term('clearTags')],
      ['.panel', this.localize.term('tagSuggestions')],
    ]);
    if (changed.has('value')) {
      this.#syncTagsFromValue();
    }

    const disabled = this.isDisabled;
    this.#control.classList.toggle('disabled', disabled);
    this.#input.disabled = disabled;
    this.#input.readOnly = this.readonly;
    const placeholder = this.placeholder || this.localize.term('tagsPlaceholder');
    this.#input.placeholder = this.#tags.length === 0 ? placeholder : '';
    this.#clearBtn.hidden = !this.clearable || disabled || this.readonly || this.#tags.length === 0;

    this.#renderTags();
    this.#syncFormAndValidity();
    this.#shapeOutline.sync();

    if (this.open && !this.#wasOpen && !disabled && !this.readonly) {
      this.#openOverlay();
    } else if ((!this.open || disabled || this.readonly) && this.#wasOpen) {
      this.#closeOverlay();
    }
    this.#wasOpen = this.open && !disabled && !this.readonly;
  }

  #syncTagsFromValue(): void {
    const raw = this.value
      ? this.value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const next: string[] = [];
    for (const item of raw) {
      if (!this.allowDuplicates && next.includes(item)) continue;
      if (next.length >= this.maxTags) break;
      next.push(item);
    }
    this.#tags = next;
  }

  #allSuggestions(): string[] {
    if (this.suggestions.length > 0) return [...this.suggestions];
    return this.#sourceSlot
      .assignedElements({ flatten: true })
      .filter((el) => {
        const tag = el.tagName.toLowerCase();
        return tag === 'k-option' || tag === 'option';
      })
      .map((el) => el.getAttribute('value') ?? el.textContent?.trim() ?? '')
      .filter(Boolean);
  }

  #maybeOpenSuggestions(): void {
    this.#refreshSuggestions(true);
  }

  #refreshSuggestions(openIfAvailable = true): void {
    const all = this.#allSuggestions();
    const q = this.#input.value.trim().toLowerCase();
    this.#filteredSuggestions = all.filter((s) => {
      if (!this.allowDuplicates && this.#tags.includes(s)) return false;
      return !q || s.toLowerCase().includes(q);
    });
    this.#activeIndex = -1;
    this.#renderSuggestions();
    if (this.#filteredSuggestions.length === 0) {
      if (this.open) this.open = false;
    } else if (openIfAvailable && !this.open && this.#tags.length < this.maxTags) {
      this.open = true;
    }
  }

  #renderSuggestions(): void {
    this.#panel.innerHTML = '';
    this.#filteredSuggestions.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'suggestion';
      btn.setAttribute('role', 'option');
      btn.classList.toggle('active', idx === this.#activeIndex);
      btn.textContent = item;
      btn.addEventListener('pointerdown', (e) => e.preventDefault());
      btn.addEventListener('click', () => {
        this.#addTag(item);
        this.#input.value = '';
        this.#refreshSuggestions(false);
        this.#input.focus();
      });
      this.#panel.append(btn);
    });
  }

  #renderTags(): void {
    for (const existing of this.#pills.querySelectorAll('.tag')) existing.remove();
    const closeSvg = getIcon('close') ?? '';
    const locked = this.isDisabled || this.readonly;

    for (const [idx, tag] of this.#tags.entries()) {
      const chip = document.createElement('span');
      chip.className = 'tag';
      chip.setAttribute('part', 'tag');

      const label = document.createElement('span');
      label.className = 'tag-label';
      label.textContent = tag;

      chip.append(label);

      if (!locked) {
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'tag-remove';
        rm.setAttribute('aria-label', this.localize.term('remove', tag));
        rm.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${closeSvg}</svg>`;
        rm.addEventListener('click', (e) => {
          e.stopPropagation();
          this.#removeAt(idx);
          this.#input.focus();
        });
        chip.append(rm);
      }

      this.#pills.insertBefore(chip, this.#input);
    }

    this.#input.hidden = this.#tags.length >= this.maxTags && !locked;
  }

  #consumeInputText(raw: string): void {
    const escaped = this.splitChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`[${escaped}\\n\\r]+`, 'g');
    const parts = raw.split(regex);
    const trailing = parts.pop() ?? '';
    for (const part of parts) {
      if (part.trim()) this.#addTag(part);
    }
    if (trailing.trim() && raw.endsWith('\n')) {
      this.#addTag(trailing);
      this.#input.value = '';
    } else {
      this.#input.value = trailing;
    }
    this.#refreshSuggestions(false);
  }

  #addTag(raw: string): boolean {
    const tag = raw.trim();
    if (!tag) return false;
    if (this.#tags.length >= this.maxTags) return false;
    if (!this.allowDuplicates && this.#tags.includes(tag)) return false;
    this.#tags.push(tag);
    emit(this, 'k-tag-add', { tag });
    this.#commitTags();
    return true;
  }

  #removeAt(index: number): void {
    const [removed] = this.#tags.splice(index, 1);
    if (removed !== undefined) {
      emit(this, 'k-tag-remove', { tag: removed });
      this.#commitTags();
      this.#refreshSuggestions(false);
    }
  }

  #commitTags(): void {
    this.value = this.#tags.join(',');
    this.#renderTags();
    this.markInteracted();
    this.#syncFormAndValidity();
    this.#clearBtn.hidden =
      !this.clearable || this.isDisabled || this.readonly || this.#tags.length === 0;
    emit<TagsChangeDetail>(this, 'k-tags-change', {
      values: [...this.#tags],
      value: this.value,
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
    this.#renderSuggestions();
    this.#panel.style.width = `${Math.max(200, this.#control.getBoundingClientRect().width)}px`;
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
    if (this.isDisabled || this.#tags.length === 0) {
      this.setFormValue(null);
    } else if (this.name) {
      const fd = new FormData();
      for (const tag of this.#tags) fd.append(this.name, tag);
      this.setFormValue(fd);
    } else {
      this.setFormValue(this.value);
    }

    if (this.isDisabled) {
      this.setValidity({});
      return;
    }
    if (this.required && this.#tags.length === 0) {
      this.setValidity({ valueMissing: true }, this.localize.term('tagsRequired'), this.#input);
      return;
    }
    this.setValidity({});
  }
}
