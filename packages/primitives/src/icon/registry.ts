/**
 * Global SVG icon registry for `<k-icon>`.
 *
 * Each entry is an SVG string (either a full `<svg>...</svg>` element or inner
 * SVG markup rendered inside a standard `0 0 16 16` viewBox).
 */

const BUILTIN_ICONS: Readonly<Record<string, string>> = {
  check:
    '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 8.5l3.2 3.2L13 4.8"/>',
  minus:
    '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M3.5 8h9"/>',
  close:
    '<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6"/>',
  search:
    '<circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M10.2 10.2L13.5 13.5"/>',
  eye: '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M1.5 8s2.4-4.2 6.5-4.2S14.5 8 14.5 8s-2.4 4.2-6.5 4.2S1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  'eye-off':
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M2.2 2.2l11.6 11.6M6.6 6.7a2 2 0 002.7 2.7M3.6 4.9C2.2 6 1.5 8 1.5 8s2.4 4.2 6.5 4.2c1.4 0 2.6-.4 3.6-1M6.3 3.9c.5-.1 1.1-.1 1.7-.1 4.1 0 6.5 4.2 6.5 4.2a10.4 10.4 0 01-1.9 2.6"/>',
  'chevron-down':
    '<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M3.8 6l4.2 4.2L12.2 6"/>',
  'chevron-right':
    '<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M6 3.8L10.2 8 6 12.2"/>',
  loader:
    '<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M8 2.2a5.8 5.8 0 1 1-4.1 1.7"/>',
  info: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M8 7.2v3.8M8 5h.01"/>',
  warning:
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" d="M8 2.2l6.2 11H1.8L8 2.2z"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M8 6.4v3.2M8 11.4h.01"/>',
  danger:
    '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M5.7 5.7l4.6 4.6M10.3 5.7l-4.6 4.6"/>',
  star: '<path fill="currentColor" d="M8 1.5l1.9 4 4.4.5-3.3 3 .9 4.3L8 11.1l-3.9 2.2.9-4.3-3.3-3 4.4-.5z"/>',
};

const registry = new Map<string, string>(Object.entries(BUILTIN_ICONS));
const listeners = new Set<(name: string) => void>();

/**
 * Registers or overrides a named SVG icon.
 *
 * `svg` may be either full `<svg ...>...</svg>` markup or inner SVG elements
 * (which `<k-icon>` wraps in a `0 0 16 16` `<svg>`).
 */
export function registerIcon(name: string, svg: string): void {
  const key = name.trim();
  if (!key) return;
  registry.set(key, svg.trim());
  for (const fn of listeners) fn(key);
}

/** Batch-registers multiple named SVG icons. */
export function registerIcons(icons: Readonly<Record<string, string>>): void {
  for (const [name, svg] of Object.entries(icons)) {
    registerIcon(name, svg);
  }
}

/** Retrieves the SVG markup registered for `name`. */
export function getIcon(name: string): string | undefined {
  return registry.get(name.trim());
}

/** Checks whether `name` is registered. */
export function hasIcon(name: string): boolean {
  return registry.has(name.trim());
}

/** Lists all registered icon names. */
export function listIcons(): string[] {
  return [...registry.keys()];
}

/** Internal subscription hook so mounted `<k-icon>` instances update when an icon is registered late. */
export function onIconRegistered(listener: (name: string) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
