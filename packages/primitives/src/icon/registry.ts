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
  plus: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M8 3.5v9M3.5 8h9"/>',
  close:
    '<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6"/>',
  search:
    '<circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M10.2 10.2L13.5 13.5"/>',
  eye: '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M1.5 8s2.4-4.2 6.5-4.2S14.5 8 14.5 8s-2.4 4.2-6.5 4.2S1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  'eye-off':
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M2.2 2.2l11.6 11.6M6.6 6.7a2 2 0 002.7 2.7M3.6 4.9C2.2 6 1.5 8 1.5 8s2.4 4.2 6.5 4.2c1.4 0 2.6-.4 3.6-1M6.3 3.9c.5-.1 1.1-.1 1.7-.1 4.1 0 6.5 4.2 6.5 4.2a10.4 10.4 0 01-1.9 2.6"/>',
  'chevron-down':
    '<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M3.8 6l4.2 4.2L12.2 6"/>',
  'chevron-up':
    '<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M3.8 10.2L8 6l4.2 4.2"/>',
  'chevron-left':
    '<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M10.2 3.8L6 8l4.2 4.2"/>',
  'chevron-right':
    '<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M6 3.8L10.2 8 6 12.2"/>',
  'chevrons-left':
    '<path fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" d="M8.5 3.8L4.3 8l4.2 4.2M12.5 3.8L8.3 8l4.2 4.2"/>',
  'chevrons-right':
    '<path fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" d="M3.5 3.8L7.7 8l-4.2 4.2M7.5 3.8L11.7 8l-4.2 4.2"/>',
  loader:
    '<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M8 2.2a5.8 5.8 0 1 1-4.1 1.7"/>',
  info: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M8 7.2v3.8M8 5h.01"/>',
  success:
    '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M5.4 8.2l1.8 1.8 3.6-3.8"/>',
  warning:
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" d="M8 2.2l6.2 11H1.8L8 2.2z"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M8 6.4v3.2M8 11.4h.01"/>',
  danger:
    '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M5.7 5.7l4.6 4.6M10.3 5.7l-4.6 4.6"/>',
  user: '<circle cx="8" cy="5.5" r="2.7" fill="none" stroke="currentColor" stroke-width="1.5"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M3 13.5c.8-2.4 2.7-3.7 5-3.7s4.2 1.3 5 3.7"/>',
  'more-horizontal':
    '<circle cx="3.5" cy="8" r="1.25" fill="currentColor"/><circle cx="8" cy="8" r="1.25" fill="currentColor"/><circle cx="12.5" cy="8" r="1.25" fill="currentColor"/>',
  calendar:
    '<rect x="2.2" y="3.5" width="11.6" height="10.3" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" d="M5.2 2v2.4M10.8 2v2.4M2.5 6.8h11"/>',
  clock:
    '<circle cx="8" cy="8" r="5.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M8 4.6V8l2.5 1.5"/>',
  upload:
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M8 10.8V2.8M4.8 5.8L8 2.6l3.2 3.2M2.5 11.2v1.6a1 1 0 001 1h9a1 1 0 001-1v-1.6"/>',
  file: '<path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" d="M4 2.2h5.2L12.5 5.5v8.3H4V2.2z"/><path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" d="M9 2.2v3.5h3.5"/>',
  trash:
    '<path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" d="M2.8 4.4h10.4M6 4.4V3h4v1.4M4.5 4.4l.6 8.8h5.8l.6-8.8"/>',
  copy: '<rect x="5.5" y="5.5" width="8" height="8.5" rx="0.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" d="M10.5 5.5V3a.8.8 0 00-.8-.8H3a.8.8 0 00-.8.8v7.2a.8.8 0 00.8.8h2.5"/>',
  pipette:
    '<path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" d="M10.6 2.6l2.8 2.8-1.6 1.6-2.8-2.8 1.6-1.6zM9.2 4.4l2.4 2.4-5.4 5.4-3.2.8.8-3.2 5.4-5.4z"/>',
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
