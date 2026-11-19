export const TILE_BRAND =
  typeof Symbol === 'function' && Symbol.for
    ? Symbol.for('@kerno/components.tile.element')
    : '@kerno/components.tile.element';

const GATE_KEY =
  typeof Symbol === 'function' && Symbol.for
    ? Symbol.for('@kerno/components.tile.gate.v1')
    : '@kerno/components.tile.gate.v1';

export interface Gate {
  installed: boolean;
  /** Clicks replayed by the gate; passed through untouched. */
  replays: WeakSet<Event>;
  /** Tiles with an activation waiting for press feedback to finish. */
  pending: WeakSet<Element>;
  /** Tiles whose keyboard press started in the current task. */
  keyboard: WeakSet<Element>;
  /** Tiles with an app launch currently running. */
  launching: WeakSet<Element>;
  /** URLs already prefetched by launches. */
  prefetched: Set<string>;
}

export function shared(): Gate {
  const root = (typeof globalThis !== 'undefined' ? globalThis : window) as unknown as Record<
    string | symbol,
    Gate | undefined
  >;
  if (!root[GATE_KEY]) {
    root[GATE_KEY] = {
      installed: false,
      replays: new WeakSet<Event>(),
      pending: new WeakSet<Element>(),
      keyboard: new WeakSet<Element>(),
      launching: new WeakSet<Element>(),
      prefetched: new Set<string>(),
    };
  }
  return root[GATE_KEY]!;
}
