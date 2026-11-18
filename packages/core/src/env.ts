/** True when running without a DOM (SSR, Node, workers). */
export const isServer: boolean =
  typeof window === 'undefined' || typeof customElements === 'undefined';

/**
 * `HTMLElement` in the browser; an inert stand-in on the server so component
 * modules can be imported during SSR without throwing.
 */
export const HTMLElementBase: typeof HTMLElement = isServer
  ? (class {} as unknown as typeof HTMLElement)
  : HTMLElement;
