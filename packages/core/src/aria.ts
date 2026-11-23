import type { ReactiveController, ReactiveControllerHost } from './element.js';
import { isServer } from './env.js';

/** A host whose shadow root contains the element that actually receives focus. */
export interface AriaForwardingHost extends ReactiveControllerHost, HTMLElement {
  readonly internals?: ElementInternals;
}

export interface AriaForwardingConfig {
  /** The element inside the shadow root that receives focus and carries the ARIA role. */
  getTarget(): Element | null | undefined;
  /**
   * Id, within the same shadow root, of the visible label wrapper (e.g. the one
   * around the default slot). Return `null` while it has no content.
   */
  getInternalLabelId?(): string | null;
  /** Name used when nothing else labels the control, e.g. a `label` property. */
  getFallbackLabel?(): string | null | undefined;
}

type ReflectingElement = Element & {
  ariaLabelledByElements?: readonly Element[] | null;
  ariaDescribedByElements?: readonly Element[] | null;
};

type NameSource =
  | { kind: 'elements'; elements: Element[] }
  | { kind: 'text'; text: string }
  | { kind: 'id'; id: string }
  | { kind: 'none' };

const OBSERVED_ATTRIBUTES = [
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-description',
];

const supportsElementReflection: boolean =
  !isServer && typeof Element !== 'undefined' && 'ariaLabelledByElements' in Element.prototype;

function textOf(elements: readonly Element[]): string {
  return elements
    .map((el) => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

function nameText(source: NameSource): string {
  if (source.kind === 'text') return source.text;
  if (source.kind === 'elements') return textOf(source.elements);
  return '';
}

function sameElements(a: readonly Element[] | null | undefined, b: readonly Element[]): boolean {
  if (!a || a.length !== b.length) return false;
  return b.every((el, i) => a[i] === el);
}

function setAttr(el: Element, name: string, value: string | null): void {
  if (value === null) {
    if (el.hasAttribute(name)) el.removeAttribute(name);
  } else if (el.getAttribute(name) !== value) {
    el.setAttribute(name, value);
  }
}

/**
 * Forwards a host's accessible name and description to the element inside its
 * shadow root that actually receives focus.
 *
 * ARIA id references and `<label for>` cannot cross a shadow boundary, so
 * without this an `aria-label`, `aria-labelledby` or `<label>` on `<k-input>`,
 * `<k-checkbox>`… never reaches the focused element and assistive technology
 * announces an unnamed control.
 *
 * Name precedence: host `aria-labelledby` › host `aria-label` › the visible
 * slotted label › associated `<label>` elements › `getFallbackLabel()`.
 * Descriptions come from host `aria-describedby` or `aria-description`.
 *
 * Uses ARIA element reflection (`ariaLabelledByElements`) so referenced labels
 * stay live; where unsupported, the referenced text is copied instead.
 *
 * @example
 * constructor() {
 *   super();
 *   new AriaForwardingController(this, { getTarget: () => this.#input });
 * }
 */
export class AriaForwardingController implements ReactiveController {
  readonly host: AriaForwardingHost;
  readonly #config: AriaForwardingConfig;
  #observer: MutationObserver | null = null;
  #labelledByReflected = false;
  #describedByReflected = false;

  constructor(host: AriaForwardingHost, config: AriaForwardingConfig) {
    this.host = host;
    this.#config = config;
    host.addController(this);
  }

  hostConnected(): void {
    if (!isServer && !this.#observer && typeof MutationObserver === 'function') {
      this.#observer = new MutationObserver(() => this.sync());
      this.#observer.observe(this.host, {
        attributes: true,
        attributeFilter: OBSERVED_ATTRIBUTES,
      });
      // `<label for>` elements and referenced nodes can appear later; re-resolve on focus.
      this.host.addEventListener('focusin', this.#onFocusIn);
    }
    this.sync();
  }

  hostDisconnected(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.host.removeEventListener('focusin', this.#onFocusIn);
  }

  hostUpdated(): void {
    this.sync();
  }

  /** Re-applies the forwarded name and description, e.g. after label content changed. */
  sync(): void {
    if (isServer) return;
    const target = this.#config.getTarget() as ReflectingElement | null | undefined;
    if (!target) return;
    this.#applyName(target, this.#nameSource());
    this.#applyDescription(target);
  }

  #onFocusIn = (): void => this.sync();

  #nameSource(): NameSource {
    const labelledBy = this.#resolveIds(this.host.getAttribute('aria-labelledby'));
    if (labelledBy.length > 0) return { kind: 'elements', elements: labelledBy };

    const label = this.host.getAttribute('aria-label')?.trim();
    if (label) return { kind: 'text', text: label };

    const id = this.#config.getInternalLabelId?.();
    if (id) return { kind: 'id', id };

    const labels = this.#nativeLabels();
    if (labels.length > 0) return { kind: 'elements', elements: labels };

    const fallback = this.#config.getFallbackLabel?.()?.trim();
    return fallback ? { kind: 'text', text: fallback } : { kind: 'none' };
  }

  #applyName(target: ReflectingElement, source: NameSource): void {
    if (source.kind === 'elements' && supportsElementReflection) {
      setAttr(target, 'aria-labelledby', null);
      setAttr(target, 'aria-label', null);
      if (!sameElements(target.ariaLabelledByElements, source.elements)) {
        target.ariaLabelledByElements = source.elements;
      }
      this.#labelledByReflected = true;
      return;
    }
    if (this.#labelledByReflected) {
      target.ariaLabelledByElements = null;
      this.#labelledByReflected = false;
    }
    setAttr(target, 'aria-labelledby', source.kind === 'id' ? source.id : null);
    setAttr(target, 'aria-label', nameText(source) || null);
  }

  #applyDescription(target: ReflectingElement): void {
    const describedBy = this.#resolveIds(this.host.getAttribute('aria-describedby'));
    if (describedBy.length > 0 && supportsElementReflection) {
      setAttr(target, 'aria-describedby', null);
      setAttr(target, 'aria-description', null);
      if (!sameElements(target.ariaDescribedByElements, describedBy)) {
        target.ariaDescribedByElements = describedBy;
      }
      this.#describedByReflected = true;
      return;
    }
    if (this.#describedByReflected) {
      target.ariaDescribedByElements = null;
      this.#describedByReflected = false;
    }
    const description = this.host.getAttribute('aria-description');
    const text = describedBy.length > 0 ? textOf(describedBy) : description;
    setAttr(target, 'aria-description', text?.trim() || null);
  }

  #resolveIds(value: string | null): Element[] {
    if (!value) return [];
    const root = this.host.getRootNode() as Document | ShadowRoot;
    if (typeof root.getElementById !== 'function') return [];
    const out: Element[] = [];
    for (const id of value.split(/\s+/)) {
      const el = id ? root.getElementById(id) : null;
      if (el) out.push(el);
    }
    return out;
  }

  #nativeLabels(): Element[] {
    try {
      return [...(this.host.internals?.labels ?? [])] as Element[];
    } catch {
      // `labels` throws on elements that are not form-associated.
      return [];
    }
  }
}
