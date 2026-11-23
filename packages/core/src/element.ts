import { HTMLElementBase } from './env.js';
import {
  defaultConverter,
  getPropertyDeclarations,
  type PropertyDeclaration,
} from './properties.js';
import { adoptStyles, type CSSInput } from './styles.js';

/** Changed properties of an update cycle, mapped to their previous values. */
export type PropertyValues = Map<PropertyKey, unknown>;

/**
 * Reusable behavior attached to a host element (focus rings, pointer tracking,
 * visual effects…). Lets cross-cutting logic live outside component classes.
 */
export interface ReactiveController {
  hostConnected?(): void;
  hostDisconnected?(): void;
  /** Before the host's `update()`. */
  hostUpdate?(): void;
  /** After the host's `updated()`. */
  hostUpdated?(): void;
}

export interface ReactiveControllerHost {
  addController(controller: ReactiveController): void;
  removeController(controller: ReactiveController): void;
  requestUpdate(): void;
  readonly updateComplete: Promise<void>;
}

const templates = new WeakMap<object, HTMLTemplateElement>();
const attributeMaps = new WeakMap<object, Map<string, PropertyDeclaration>>();

function attributeMap(ctor: object): Map<string, PropertyDeclaration> {
  let map = attributeMaps.get(ctor);
  if (!map) {
    map = new Map();
    for (const decl of getPropertyDeclarations(ctor).values()) {
      if (decl.attributeName) map.set(decl.attributeName, decl);
    }
    attributeMaps.set(ctor, map);
  }
  return map;
}

/**
 * Base class for every Kerno element.
 *
 * Rendering model: the static `template` is parsed once per class and cloned
 * into the shadow root once per instance. Updates are batched into a microtask
 * and applied imperatively in `update()` — no virtual DOM, no template engine.
 *
 * Lifecycle (per update): `willUpdate` → attribute reflection → `update` →
 * `firstUpdated` (first time only) → `updated`.
 */
export abstract class KernoElement extends HTMLElementBase implements ReactiveControllerHost {
  /** Styles adopted into every instance's shadow root. */
  static styles?: CSSInput;
  /** Static shadow DOM markup, stamped once per instance. */
  static template = '';
  static shadowRootOptions: ShadowRootInit = { mode: 'open' };

  static get observedAttributes(): string[] {
    return [...attributeMap(this).keys()];
  }

  readonly internals: ElementInternals;
  readonly renderRoot: ShadowRoot;

  #changed: PropertyValues = new Map();
  #updatePending = false;
  #hasUpdated = false;
  #isSetUp = false;
  #controllers = new Set<ReactiveController>();
  #reflectingAttribute: string | null = null;
  #updateDone: { promise: Promise<void>; resolve: () => void } | null = null;
  /** The shadow root came from declarative shadow DOM (SSR) and already holds the markup. */
  #hydrated = false;

  constructor() {
    super();
    const ctor = this.constructor as typeof KernoElement;
    this.internals = this.attachInternals();
    // Reuse a declarative shadow root rendered on the server, if any.
    const declarative = this.internals.shadowRoot;
    this.#hydrated = declarative !== null;
    this.renderRoot = declarative ?? this.attachShadow(ctor.shadowRootOptions);
    adoptStyles(this.renderRoot, ctor.styles);
    this.requestUpdate();
  }

  /** Resolves once pending updates have been applied. */
  get updateComplete(): Promise<void> {
    if (!this.#updatePending) return Promise.resolve();
    if (!this.#updateDone) {
      let resolve!: () => void;
      const promise = new Promise<void>((r) => (resolve = r));
      this.#updateDone = { promise, resolve };
    }
    return this.#updateDone.promise;
  }

  get hasUpdated(): boolean {
    return this.#hasUpdated;
  }

  addController(controller: ReactiveController): void {
    this.#controllers.add(controller);
    if (this.isConnected) controller.hostConnected?.();
  }

  removeController(controller: ReactiveController): void {
    this.#controllers.delete(controller);
  }

  /**
   * Schedules an update. Called automatically by `@prop`/`@state` setters;
   * call manually after mutating non-reactive data.
   */
  requestUpdate(name?: PropertyKey, oldValue?: unknown): void {
    if (name !== undefined && !this.#changed.has(name)) this.#changed.set(name, oldValue);
    if (this.#updatePending) return;
    this.#updatePending = true;
    queueMicrotask(() => this.#performUpdate());
  }

  connectedCallback(): void {
    if (!this.#isSetUp) {
      this.#upgradeProperties();
      this.#setUp();
    }
    for (const c of this.#controllers) c.hostConnected?.();
    if (this.#updatePending && !this.#hasUpdated) this.#performUpdate();
  }

  disconnectedCallback(): void {
    for (const c of this.#controllers) c.hostDisconnected?.();
  }

  attributeChangedCallback(attribute: string, old: string | null, value: string | null): void {
    if (old === value || attribute === this.#reflectingAttribute) return;
    const decl = attributeMap(this.constructor).get(attribute);
    if (!decl) return;
    const converter = decl.converter?.fromAttribute ?? defaultConverter.fromAttribute;
    (this as Record<string, unknown>)[decl.name] = converter(value, decl.type);
  }

  // ---------------------------------------------------------------------------
  // Overridable hooks
  // ---------------------------------------------------------------------------

  /** Creates the initial shadow DOM. Defaults to cloning the static `template`. */
  protected render(): Node | null {
    const ctor = this.constructor as typeof KernoElement;
    if (!ctor.template) return null;
    let template = templates.get(ctor);
    if (!template) {
      template = document.createElement('template');
      template.innerHTML = ctor.template;
      templates.set(ctor, template);
    }
    return template.content.cloneNode(true);
  }

  /**
   * Runs once, after the shadow DOM exists (stamped or hydrated from SSR) and
   * before the first update. Query internal nodes and bind listeners here.
   */
  protected setup(): void {}

  /** Compute derived state before rendering. Property sets here do not re-trigger. */
  protected willUpdate(_changed: PropertyValues): void {}

  /** Apply state to the DOM. */
  protected update(_changed: PropertyValues): void {}

  protected firstUpdated(_changed: PropertyValues): void {}

  protected updated(_changed: PropertyValues): void {}

  // ---------------------------------------------------------------------------

  #setUp(): void {
    this.#isSetUp = true;
    // Stamp the template unless the markup came from the server. Don't test for child
    // nodes: where constructable stylesheets are unsupported, the fallback `<style>`
    // elements are already in the root at this point.
    if (!this.#hydrated) {
      const content = this.render();
      if (content) this.renderRoot.append(content);
    }
    this.setup();
  }

  /** Re-applies values set on the instance before the element was upgraded. */
  #upgradeProperties(): void {
    const self = this as Record<string, unknown>;
    for (const name of getPropertyDeclarations(this.constructor).keys()) {
      if (Object.hasOwn(this, name)) {
        const value = self[name];
        delete self[name];
        self[name] = value;
      }
    }
  }

  #performUpdate(): void {
    if (!this.#updatePending) return;
    // The first update waits for connection so the DOM is in place.
    if (!this.#hasUpdated && !this.#isSetUp) return;

    let committed = false;
    try {
      this.willUpdate(this.#changed);
      // Changes made in willUpdate are folded into this cycle.
      const changed = this.#changed;
      this.#changed = new Map();
      // From here on, any `requestUpdate()` — with or without a property name —
      // schedules a fresh cycle instead of being folded into (or lost from) this one.
      this.#updatePending = false;
      committed = true;

      for (const c of this.#controllers) c.hostUpdate?.();
      this.#reflect(changed);
      this.update(changed);
      if (!this.#hasUpdated) {
        this.#hasUpdated = true;
        this.firstUpdated(changed);
      }
      for (const c of this.#controllers) c.hostUpdated?.();
      this.updated(changed);
    } catch (error) {
      // A throwing `willUpdate` must not leave the element stuck as pending.
      if (!committed) {
        this.#changed = new Map();
        this.#updatePending = false;
      }
      throw error;
    } finally {
      // Settle `updateComplete` only once no follow-up cycle has been queued.
      if (!this.#updatePending) {
        this.#updateDone?.resolve();
        this.#updateDone = null;
      }
    }
  }

  #reflect(changed: PropertyValues): void {
    const decls = getPropertyDeclarations(this.constructor);
    for (const name of changed.keys()) {
      const decl = decls.get(name as string);
      if (!decl?.reflect || !decl.attributeName) continue;
      const toAttribute = decl.converter?.toAttribute ?? defaultConverter.toAttribute;
      const value = toAttribute((this as Record<string, unknown>)[decl.name], decl.type);
      this.#reflectingAttribute = decl.attributeName;
      if (value === null) this.removeAttribute(decl.attributeName);
      else this.setAttribute(decl.attributeName, value);
      this.#reflectingAttribute = null;
    }
  }
}
