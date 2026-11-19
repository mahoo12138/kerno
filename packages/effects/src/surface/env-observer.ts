import { isServer } from '@kerno/core';
import { THEME_ATTRIBUTE } from '@kerno/tokens';

export type EnvChangeCallback = () => void;

interface Subscription {
  readonly host: HTMLElement;
  readonly callback: EnvChangeCallback;
  readonly hostObserver: MutationObserver | null;
}

const subscriptions = new Set<Subscription>();
let globalActive = false;
let colorSchemeQuery: MediaQueryList | null = null;
let transparencyQuery: MediaQueryList | null = null;
let dprQuery: MediaQueryList | null = null;
let themeAttrObserver: MutationObserver | null = null;

/** Checks whether `node` is `ancestor` or a descendant of `ancestor`, piercing open shadow roots. */
function isWithinSubtree(ancestor: Node, node: Node): boolean {
  let current: Node | null = node;
  while (current) {
    if (current === ancestor) return true;
    if (current instanceof ShadowRoot) {
      current = current.host;
    } else {
      current = current.parentNode;
    }
  }
  return false;
}

function notifyAll(): void {
  for (const sub of subscriptions) {
    sub.callback();
  }
}

function notifySubtree(root: Node): void {
  if (root === document || root === document.documentElement) {
    notifyAll();
    return;
  }
  for (const sub of subscriptions) {
    if (isWithinSubtree(root, sub.host)) {
      sub.callback();
    }
  }
}

const onColorSchemeChange = (): void => notifyAll();
const onTransparencyChange = (): void => notifyAll();
const onThemeEvent = (event: Event): void => {
  const target = event.target;
  if (target instanceof Node) notifySubtree(target);
  else notifyAll();
};

function armDprWatcher(): void {
  if (dprQuery) {
    dprQuery.removeEventListener('change', onDprChange);
    dprQuery = null;
  }
  if (isServer || typeof window.matchMedia !== 'function' || subscriptions.size === 0) return;
  const dpr = window.devicePixelRatio || 1;
  dprQuery = window.matchMedia(`(resolution: ${dpr}dppx)`);
  dprQuery.addEventListener('change', onDprChange, { once: true });
}

function onDprChange(): void {
  notifyAll();
  armDprWatcher();
}

function startGlobal(): void {
  if (globalActive || isServer) return;
  globalActive = true;

  if (typeof window.matchMedia === 'function') {
    colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    colorSchemeQuery.addEventListener('change', onColorSchemeChange);

    transparencyQuery = window.matchMedia('(prefers-reduced-transparency: reduce)');
    transparencyQuery.addEventListener('change', onTransparencyChange);
  }

  armDprWatcher();
  document.addEventListener('k-theme-change', onThemeEvent, true);

  if (typeof MutationObserver === 'function' && document.documentElement) {
    themeAttrObserver = new MutationObserver((records) => {
      const notified = new Set<Node>();
      for (const record of records) {
        if (!notified.has(record.target)) {
          notified.add(record.target);
          notifySubtree(record.target);
        }
      }
    });
    themeAttrObserver.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: [THEME_ATTRIBUTE],
    });
  }
}

function stopGlobal(): void {
  if (!globalActive) return;
  globalActive = false;

  colorSchemeQuery?.removeEventListener('change', onColorSchemeChange);
  colorSchemeQuery = null;

  transparencyQuery?.removeEventListener('change', onTransparencyChange);
  transparencyQuery = null;

  if (dprQuery) {
    dprQuery.removeEventListener('change', onDprChange);
    dprQuery = null;
  }

  document.removeEventListener('k-theme-change', onThemeEvent, true);
  themeAttrObserver?.disconnect();
  themeAttrObserver = null;
}

/**
 * Subscribes a surface host to environment and theme changes:
 * - System `prefers-color-scheme` and `prefers-reduced-transparency`
 * - Window `devicePixelRatio` changes (monitor move / zoom)
 * - `data-k-theme` attribute changes on any ancestor (including across shadow roots)
 * - `k-theme-change` events from `applyTheme()`
 * - Inline `style` / `class` mutations on `host` itself
 */
function stripCompositorStyle(styleAttr: string | null): string {
  if (!styleAttr) return '';
  return styleAttr.replace(/(?:^|;)\s*(?:transform|filter)\s*:[^;]*/gi, '').trim();
}

export function observeSurfaceEnvironment(
  host: HTMLElement,
  callback: EnvChangeCallback,
): () => void {
  if (isServer) return () => {};

  let lastStyleKey = stripCompositorStyle(host.getAttribute('style'));
  let hostObserver: MutationObserver | null = null;
  if (typeof MutationObserver === 'function') {
    hostObserver = new MutationObserver((records) => {
      let relevant = false;
      for (const rec of records) {
        if (rec.attributeName === 'style') {
          const nextKey = stripCompositorStyle(host.getAttribute('style'));
          if (nextKey !== lastStyleKey) {
            lastStyleKey = nextKey;
            relevant = true;
          }
        } else {
          relevant = true;
        }
      }
      if (relevant) callback();
    });
    hostObserver.observe(host, {
      attributes: true,
      attributeFilter: ['style', 'class', THEME_ATTRIBUTE],
    });
  }

  const sub: Subscription = { host, callback, hostObserver };
  subscriptions.add(sub);
  if (subscriptions.size === 1) startGlobal();

  return () => {
    sub.hostObserver?.disconnect();
    subscriptions.delete(sub);
    if (subscriptions.size === 0) stopGlobal();
  };
}
