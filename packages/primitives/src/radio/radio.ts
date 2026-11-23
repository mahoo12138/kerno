import {
  AriaForwardingController,
  FormAssociatedElement,
  prop,
  state,
  type PropertyValues,
} from '@kerno/core';
import { radioGroupStyles, radioStyles } from './radio.styles.js';

export type RadioSize = 'sm' | 'md' | 'lg';
export type RadioGroupOrientation = 'horizontal' | 'vertical';

const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp']);
const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown']);

/**
 * Form-associated radio button. Works inside a `<k-radio-group>` or standalone
 * coordinated by a shared `name` attribute within the same form or root.
 *
 * @tag k-radio
 *
 * @slot - Radio label text.
 *
 * @csspart base - Outer interactive wrapper.
 * @csspart control - Focusable radio circle (`role="radio"`).
 * @csspart indicator - Inner selected dot.
 * @csspart label - Label wrapper.
 *
 * @fires input - Fired when selected by the user.
 * @fires change - Fired when selected by the user.
 */
export class KRadio extends FormAssociatedElement {
  static override styles = radioStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<div part="base" class="base"><button part="control" class="control" type="button" role="radio" aria-checked="false"><span part="indicator" class="indicator" aria-hidden="true"></span></button><span part="label" class="label" id="label"><slot></slot></span></div>`;

  @prop({ type: Boolean, reflect: true }) accessor checked = false;
  @prop() accessor value = 'on';
  @prop({ reflect: true }) accessor size: RadioSize = 'md';

  /** Disabled state inherited from an ancestor `<k-radio-group>`. */
  @state() accessor groupDisabled = false;

  #base!: HTMLDivElement;
  #control!: HTMLButtonElement;
  #defaultChecked = false;
  #defaultCaptured = false;
  #rovingTabIndex = 0;

  constructor() {
    super();
    this.addEventListener('click', this.#onHostClick, { capture: true });
    this.addEventListener('keydown', this.#onKeyDown);
    // Forward host aria-label / aria-labelledby / <label for> to the focused inner element.
    new AriaForwardingController(this, {
      getTarget: () => this.#control,
      // Name the control by its visible slotted label while it has content.
      getInternalLabelId: () => this.renderRoot.querySelector('#label.has-content') && 'label',
    });
  }

  override get isDisabled(): boolean {
    return super.isDisabled || this.groupDisabled;
  }

  get group(): KRadioGroup | null {
    const el = this.closest('k-radio-group');
    return el instanceof KRadioGroup ? el : null;
  }

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      this.#defaultChecked = this.hasAttribute('checked') || this.checked;
      this.#defaultCaptured = true;
    }
    super.connectedCallback();
    this.group?.notifyRadiosChanged();
  }

  override click(): void {
    if (this.#control) this.#control.click();
    else super.click();
  }

  override formResetCallback(): void {
    super.formResetCallback();
    if (!this.group) {
      this.checked = this.#defaultChecked;
    }
  }

  /** Internal helper used by group / peer roving focus management. */
  setRovingTabIndex(index: 0 | -1): void {
    this.#rovingTabIndex = index;
    if (this.#control) {
      this.#control.tabIndex = this.isDisabled ? -1 : index;
    }
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLDivElement;
    this.#control = this.renderRoot.querySelector('.control') as HTMLButtonElement;

    const slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;
    const syncSlot = (): void => {
      const hasText = slot
        .assignedNodes({ flatten: true })
        .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent?.trim().length ?? 0) > 0);
      slot.parentElement?.classList.toggle('has-content', hasText);
      // Re-sync the forwarded accessible name now that the visible label changed.
      this.requestUpdate();
    };
    slot.addEventListener('slotchange', syncSlot);
    syncSlot();
  }

  protected override update(_changed: PropertyValues): void {
    const disabled = this.isDisabled;
    this.#control.disabled = disabled;
    this.#control.tabIndex = disabled ? -1 : this.#rovingTabIndex;
    this.#base.classList.toggle('disabled', disabled);
    this.#control.setAttribute('aria-checked', this.checked ? 'true' : 'false');

    if (this.group) {
      // Parent <k-radio-group> owns the form submission and constraint validation.
      this.setFormValue(null);
      this.setValidity({});
      return;
    }

    if (this.checked) {
      for (const peer of this.#getStandalonePeers()) {
        if (peer !== this && peer.checked) {
          peer.checked = false;
        }
      }
    }
    this.#syncStandaloneGroupState();
  }

  #getStandalonePeers(): KRadio[] {
    if (!this.name) return [this];
    const scope: ParentNode =
      this.form ?? (this.getRootNode() as Document | ShadowRoot | Element) ?? document;
    const all = [...scope.querySelectorAll<KRadio>('k-radio')];
    return all.filter(
      (r): r is KRadio =>
        r instanceof KRadio && !r.group && r.name === this.name && r.form === this.form,
    );
  }

  #syncStandaloneGroupState(): void {
    const peers = this.#getStandalonePeers();
    const anyChecked = peers.some((r) => r.checked);
    const anyRequired = peers.some((r) => r.required);
    const firstEnabled = peers.find((r) => !r.isDisabled);

    for (const peer of peers) {
      const isRovingStop = anyChecked ? peer.checked : peer === firstEnabled;
      peer.setRovingTabIndex(isRovingStop ? 0 : -1);
      peer.setFormValue(peer.checked ? peer.value : null);
      peer.setValidity(
        { valueMissing: anyRequired && !anyChecked },
        this.localize.term('radioRequired'),
        peer.#control,
      );
    }
  }

  #selectFromUser(): void {
    if (this.isDisabled || this.checked) return;
    const group = this.group;
    if (group) {
      group.selectRadio(this, true);
      return;
    }
    this.checked = true;
    for (const peer of this.#getStandalonePeers()) {
      peer.markInteracted();
    }
    this.#syncStandaloneGroupState();
    this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  #onHostClick = (event: MouseEvent): void => {
    if (this.isDisabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.#selectFromUser();
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (this.isDisabled) return;
    if (!PREV_KEYS.has(event.key) && !NEXT_KEYS.has(event.key)) return;

    const radios = (this.group ? this.group.getRadios() : this.#getStandalonePeers()).filter(
      (r) => !r.isDisabled,
    );
    if (radios.length === 0) return;

    event.preventDefault();
    const currentIndex = radios.indexOf(this);
    const delta = NEXT_KEYS.has(event.key) ? 1 : -1;
    const nextIndex = (currentIndex + delta + radios.length) % radios.length;
    const target = radios[nextIndex]!;
    target.focus();
    target.#selectFromUser();
  };
}

/**
 * Form-associated radio group container managing value selection, roving focus
 * and constraint validation for descendant `<k-radio>` controls.
 *
 * @tag k-radio-group
 *
 * @slot - `<k-radio>` elements.
 *
 * @csspart base - Layout container (`role="radiogroup"`).
 *
 * @cssprop --k-radio-group-gap
 *
 * @fires input - Fired when the selected radio changes due to user interaction.
 * @fires change - Fired when the selected radio changes due to user interaction.
 */
export class KRadioGroup extends FormAssociatedElement {
  static override styles = radioGroupStyles;
  static override template = /* html */ `<div part="base" class="base" role="radiogroup"><slot></slot></div>`;

  @prop({ reflect: true }) accessor value = '';
  @prop({ reflect: true }) accessor orientation: RadioGroupOrientation = 'horizontal';

  #base!: HTMLDivElement;
  #defaultValue = '';
  #defaultCaptured = false;

  constructor() {
    super();
    // Forward host aria-label / aria-labelledby / <label for> to the focused inner element.
    new AriaForwardingController(this, { getTarget: () => this.#base });
  }

  override connectedCallback(): void {
    if (!this.#defaultCaptured) {
      const attrVal = this.getAttribute('value');
      if (attrVal !== null) {
        this.#defaultValue = attrVal;
      } else {
        const preChecked = this.querySelector<KRadio>('k-radio[checked]');
        this.#defaultValue = preChecked?.getAttribute('value') ?? preChecked?.value ?? this.value;
        if (!this.value && this.#defaultValue) {
          this.value = this.#defaultValue;
        }
      }
      this.#defaultCaptured = true;
    }
    super.connectedCallback();
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.value = this.#defaultValue;
    this.#syncRadios();
  }

  getRadios(): KRadio[] {
    return [...this.querySelectorAll('k-radio')].filter((r): r is KRadio => r instanceof KRadio);
  }

  notifyRadiosChanged(): void {
    if (!this.hasUpdated) return;
    this.#syncRadios();
  }

  /** Called by a child `<k-radio>` when activated by user click or keyboard navigation. */
  selectRadio(radio: KRadio, fromUser: boolean): void {
    if (this.isDisabled || radio.isDisabled) return;
    const changed = this.value !== radio.value;
    this.value = radio.value;
    if (fromUser) this.markInteracted();
    this.#syncRadios();
    if (fromUser && changed) {
      this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLDivElement;
    const slot = this.renderRoot.querySelector('slot') as HTMLSlotElement;
    slot.addEventListener('slotchange', () => this.#syncRadios());
  }

  protected override update(_changed: PropertyValues): void {
    this.#base.setAttribute('aria-orientation', this.orientation);
    this.#base.setAttribute('aria-required', this.required ? 'true' : 'false');
    this.#base.setAttribute('aria-disabled', this.isDisabled ? 'true' : 'false');
    this.#syncRadios();
  }

  #syncRadios(): void {
    const radios = this.getRadios();
    const groupDisabled = this.isDisabled;

    // If value wasn't set on the group, adopt any initially checked child radio.
    if (!this.value) {
      const checkedChild = radios.find((r) => r.checked);
      if (checkedChild) {
        this.value = checkedChild.value;
      }
    }

    for (const r of radios) {
      r.groupDisabled = groupDisabled;
      r.checked = this.value !== '' && r.value === this.value;
    }

    const enabled = radios.filter((r) => !r.isDisabled);
    const activeStop = enabled.find((r) => r.checked) ?? enabled[0];
    for (const r of radios) {
      r.setRovingTabIndex(r === activeStop ? 0 : -1);
    }

    const hasSelection = radios.some((r) => r.checked);
    this.setFormValue(hasSelection ? this.value : null);
    this.setValidity(
      { valueMissing: this.required && !hasSelection },
      this.localize.term('radioRequired'),
      radios[0] ?? this.#base,
    );
  }
}
