import { isServer } from './env.js';

/**
 * Registers a custom element, safely and idempotently.
 *
 * - No-op on the server.
 * - Re-registering the same class under the same name is silently ignored.
 * - A name already taken by a different class logs a warning and is skipped
 *   (typically two copies of Kerno on one page).
 * - A class may be registered under several names: when `ctor` is already
 *   defined elsewhere, a trivial subclass is registered instead, so
 *   `define('my-button', KButton)` works alongside `<k-button>`.
 */
export function define<T extends CustomElementConstructor>(
  tagName: string,
  ctor: T,
  registry: CustomElementRegistry | undefined = isServer ? undefined : customElements,
): T {
  if (!registry) return ctor;

  const existing = registry.get(tagName);
  if (existing) {
    if (existing !== ctor && !(existing.prototype instanceof ctor)) {
      console.warn(
        `[kerno] <${tagName}> is already defined by another class; skipping. ` +
          'If two Kerno versions share a page, register one under a different tag name.',
      );
    }
    return ctor;
  }

  const alreadyNamed = typeof registry.getName === 'function' && registry.getName(ctor) !== null;
  registry.define(
    tagName,
    alreadyNamed ? class extends (ctor as CustomElementConstructor) {} : ctor,
  );
  return ctor;
}
