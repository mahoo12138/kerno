import { isServer, type ReactiveController, type ReactiveControllerHost } from '@kerno/core';
import type * as Outline from './outline.js';
import type { ShapeOutlineConfig, ShapeOutlineController } from './outline.js';

type OutlineModule = typeof Outline;

let outlineModule: OutlineModule | null = null;
let pending: Promise<OutlineModule> | null = null;

/**
 * Loads the full shape-outline renderer (geometry solver, SVG stroke, Reveal and
 * Pressure). Controllers load it on their own when first needed; call this early
 * — e.g. at app start — when the first paint already uses non-rounded shapes, so
 * no frame renders with plain corners. Once resolved, controllers activate
 * synchronously.
 */
export function loadShapeOutline(): Promise<void> {
  pending ??= import('./outline.js').then(
    (module) => (outlineModule = module),
    (error: unknown) => {
      pending = null;
      throw error;
    },
  );
  return pending.then(() => undefined);
}

const NON_ROUNDED_KINDS = new Set(['chamfer', 'scallop', 'notch']);

/** Custom properties that can turn an otherwise rounded control into a parametric outline. */
const PARAMETRIC_PROPERTIES = ['--k-edge-kind'];
for (const side of ['top', 'right', 'bottom', 'left']) {
  PARAMETRIC_PROPERTIES.push(`--k-edge-${side}-kind`);
}
for (const corner of ['top-left', 'top-right', 'bottom-right', 'bottom-left']) {
  PARAMETRIC_PROPERTIES.push(`--k-corner-${corner}-shift-x`, `--k-corner-${corner}-shift-y`);
}

/** Values that leave the outline rounded. */
const INERT_VALUE = /^(?:|flat|auto|0|0px|0%)$/;

/**
 * Drop-in, lightweight front for `ShapeOutlineController`.
 *
 * Rounded controls — the default — never load the shape engine: they stay on
 * pure CSS with zero observers and zero extra nodes. The full controller is
 * loaded with a dynamic `import()` and activated the first time a host needs it:
 * a `chamfer` / `scallop` / `notch` shape, opt-in `reveal` / `pressure`, or
 * parametric `--k-edge-*` / `--k-corner-*-shift-*` custom properties.
 *
 * @example
 * readonly #shapeOutline = new LazyShapeOutlineController(this, {
 *   getTarget: () => this.#base ?? null,
 *   getKind: () => this.shape,
 * });
 */
export class LazyShapeOutlineController implements ReactiveController {
  readonly host: ReactiveControllerHost & HTMLElement;
  readonly #config: ShapeOutlineConfig;
  #active: ShapeOutlineController | null = null;
  #loading = false;
  #cssChecked = false;

  constructor(host: ReactiveControllerHost & HTMLElement, config: ShapeOutlineConfig) {
    this.host = host;
    this.#config = config;
    host.addController(this);
  }

  /** The full controller, once a shape or effect required it. */
  get active(): ShapeOutlineController | null {
    return this.#active;
  }

  hostConnected(): void {
    this.#check(false);
  }

  hostUpdated(): void {
    // Computed custom properties are read once, then again on every explicit `sync()`.
    this.#check(!this.#cssChecked);
  }

  /** Re-evaluates the shape; forwards to the full controller once it is active. */
  sync(): void {
    if (this.#active) this.#active.sync();
    else this.#check(true);
  }

  #check(readCss: boolean): void {
    if (this.#active || this.#loading || isServer) return;
    if (!this.#needsOutline(readCss)) return;
    if (outlineModule) {
      this.#activate(outlineModule);
      return;
    }
    this.#loading = true;
    void loadShapeOutline().then(
      () => {
        this.#loading = false;
        this.#activate(outlineModule!);
      },
      (error: unknown) => {
        this.#loading = false;
        console.warn('[kerno] Failed to load the shape outline renderer.', error);
      },
    );
  }

  #activate(module: OutlineModule): void {
    if (this.#active) return;
    // Registers itself on the host and syncs immediately when connected.
    this.#active = new module.ShapeOutlineController(this.host, this.#config);
  }

  #needsOutline(readCss: boolean): boolean {
    const config = this.#config;
    if (NON_ROUNDED_KINDS.has(String(config.getKind()))) return true;
    if (this.#wants(config.reveal, 'reveal') || this.#wants(config.pressure, 'pressure')) {
      return true;
    }
    if (!readCss || !this.host.isConnected || typeof getComputedStyle !== 'function') {
      return false;
    }
    this.#cssChecked = true;
    const style = getComputedStyle(this.host);
    const value = (name: string): string => style.getPropertyValue(name).trim();
    return PARAMETRIC_PROPERTIES.some((name) => !INERT_VALUE.test(value(name)));
  }

  #wants(option: boolean | (() => boolean) | undefined, attribute: string): boolean {
    const value =
      typeof option === 'function' ? option() : (option ?? this.host.hasAttribute(attribute));
    return Boolean(value) && !this.host.hasAttribute(`no-${attribute}`);
  }
}
