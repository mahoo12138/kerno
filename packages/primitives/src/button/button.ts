import { FormAssociatedElement, prop, type PropertyValues } from '@kerno/core';
import { isCornerKind, toClipPath, toSvgPath, type CornerKind } from '@kerno/effects/shape';
import { buttonStyles } from './button.styles.js';

export type ButtonVariant = 'standard' | 'accent' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';
export type ButtonShape = CornerKind;

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * A button that participates in forms.
 *
 * @tag k-button
 *
 * @slot - Label.
 * @slot prefix - Content before the label (usually an icon).
 * @slot suffix - Content after the label.
 *
 * @csspart base - The native `<button>`.
 * @csspart label - Label wrapper.
 * @csspart prefix - Prefix wrapper.
 * @csspart suffix - Suffix wrapper.
 *
 * @cssprop --k-button-height
 * @cssprop --k-button-padding-x
 * @cssprop --k-button-gap
 * @cssprop --k-button-radius
 * @cssprop --k-button-font-size
 * @cssprop --k-button-font-weight
 * @cssprop --k-button-bg
 * @cssprop --k-button-bg-hover
 * @cssprop --k-button-bg-active
 * @cssprop --k-button-fg
 * @cssprop --k-button-border-color
 */
export class KButton extends FormAssociatedElement {
  static override styles = buttonStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<button part="base" class="base" type="button"><span part="prefix" class="prefix"><slot name="prefix"></slot></span><span part="label" class="label"><slot></slot></span><span part="suffix" class="suffix"><slot name="suffix"></slot></span></button>`;

  @prop({ reflect: true }) accessor variant: ButtonVariant = 'standard';
  @prop({ reflect: true }) accessor size: ButtonSize = 'md';
  /** Corner geometry family (`'rounded' | 'chamfer' | 'scallop' | 'notch'`). */
  @prop({ reflect: true }) accessor shape: ButtonShape = 'rounded';
  /** Form behavior when activated. */
  @prop() accessor type: ButtonType = 'button';
  /** Submitted with the form as `name=value` when this button submits it. */
  @prop() accessor value = '';

  #base!: HTMLButtonElement;
  #shapeObserver: ResizeObserver | null = null;
  #shapeSvg: SVGSVGElement | null = null;
  #shapePath: SVGPathElement | null = null;

  constructor() {
    super();
    // Capture phase: swallow activation while disabled before user handlers run.
    this.addEventListener('click', this.#onClick, { capture: true });
  }

  override click(): void {
    if (this.#base) this.#base.click();
    else super.click();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#shapeObserver?.disconnect();
    this.#shapeObserver = null;
  }

  protected override setup(): void {
    this.#base = this.renderRoot.querySelector('.base') as HTMLButtonElement;
    for (const slot of this.renderRoot.querySelectorAll<HTMLSlotElement>('slot[name]')) {
      const sync = (): void => {
        slot.parentElement?.classList.toggle('has-content', slot.assignedNodes().length > 0);
      };
      slot.addEventListener('slotchange', sync);
      sync();
    }
  }

  protected override update(changed: PropertyValues): void {
    if (changed.has('disabled') || changed.has('formDisabled')) {
      this.#base.disabled = this.isDisabled;
    }
    if (changed.has('shape') || changed.has('size')) {
      this.#syncShapeMode();
    }
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

  #onClick = (event: MouseEvent): void => {
    if (this.isDisabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const form = this.form;
    if (!form || this.type === 'button') return;
    if (this.type === 'reset') {
      form.reset();
      return;
    }
    this.#submit(form);
  };

  /**
   * `form.requestSubmit(submitter)` only accepts native buttons, so a hidden
   * native submitter is used. This keeps constraint validation, the submit
   * event's `submitter`-dependent behavior and `name=value` submission intact.
   */
  #submit(form: HTMLFormElement): void {
    const proxy = document.createElement('button');
    proxy.type = 'submit';
    proxy.hidden = true;
    if (this.name) proxy.name = this.name;
    if (this.value) proxy.value = this.value;
    for (const attr of [
      'formaction',
      'formenctype',
      'formmethod',
      'formnovalidate',
      'formtarget',
    ]) {
      const value = this.getAttribute(attr);
      if (value !== null) proxy.setAttribute(attr, value);
    }
    form.append(proxy);
    proxy.click();
    proxy.remove();
  }
}
