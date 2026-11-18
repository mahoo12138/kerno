/**
 * Event conventions:
 * - Reuse native event names (`click`, `input`, `change`, `focus`…) when the
 *   semantics match, so frameworks bind them without adapters.
 * - Kerno-specific events are prefixed `k-` (e.g. `k-open`, `k-close`) and are
 *   declared on `HTMLElementEventMap` by the component that dispatches them.
 * - Events bubble and cross shadow boundaries (`composed`) by default.
 */
export interface EmitOptions extends EventInit {
  cancelable?: boolean;
}

/**
 * Dispatches a `CustomEvent`.
 *
 * @returns `false` if the event was cancelable and a listener called `preventDefault()`.
 */
export function emit<T = undefined>(
  target: EventTarget,
  type: string,
  detail?: T,
  options: EmitOptions = {},
): boolean {
  return target.dispatchEvent(
    new CustomEvent<T>(type, {
      bubbles: true,
      composed: true,
      cancelable: false,
      ...options,
      detail: detail as T,
    }),
  );
}
