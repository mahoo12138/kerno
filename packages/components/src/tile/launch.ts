import {
  bezierAt,
  parseEasing,
  prefersReducedMotion,
  type CubicBezierTuple,
  type SurfaceMotionState,
} from '@kerno/effects';
import { parseTime, parseTimeout } from './delay.js';
import { shared } from './shared.js';

interface MotionTile extends Element {
  motion(state: SurfaceMotionState | null): void;
}

const DURATION = 620;
const EASING: CubicBezierTuple = [0.17, 0.55, 0.3, 0.95];
const GROW_SHARE = 0.16;
const FADE = 167;
const SPLASH_HOLD = 500;
const TIMEOUT = 5000;
const TURN_SHARE = 0.3;
const TURN_EASING: CubicBezierTuple = [0.42, 0, 1, 1];
const SPLASH_TURN_EASING: CubicBezierTuple = [0.1, 0.9, 0.2, 1];

const noop = (): void => undefined;

function readCssProp(element: Element, kernoName: string, axName: string): string {
  const style = getComputedStyle(element);
  return style.getPropertyValue(kernoName).trim() || style.getPropertyValue(axName).trim();
}

function timeOf(element: Element, kernoName: string, axName: string, fallback: number): number {
  const time = parseTime(readCssProp(element, kernoName, axName));
  return time === null ? fallback : time;
}

/** True when the tile launches with the Windows 8 3D flip (`--k-tile-launch: flip`). */
export function flips(tile: Element): boolean {
  return readCssProp(tile, '--k-tile-launch', '--ax-tile-launch') === 'flip';
}

export function isLaunching(tile: Element): boolean {
  return shared().launching.has(tile);
}

/**
 * Replays a held click on `target`, marking it with `kReplay = true` (and `axReplay = true`)
 * so analytics or the activation gate can distinguish it.
 */
export function replay(source: MouseEvent | null, target: EventTarget, tile: Element): boolean {
  const gate = shared();
  gate.pending.delete(tile);
  if (!tile.isConnected) return false;
  const click = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    detail: source ? source.detail : 0,
    screenX: source ? source.screenX : 0,
    screenY: source ? source.screenY : 0,
    clientX: source ? source.clientX : 0,
    clientY: source ? source.clientY : 0,
    button: 0,
    buttons: 0,
  });
  (click as MouseEvent & { kReplay?: boolean; axReplay?: boolean }).kReplay = true;
  (click as MouseEvent & { kReplay?: boolean; axReplay?: boolean }).axReplay = true;
  gate.replays.add(click);
  return target.dispatchEvent(click);
}

function leavesPage(action: Element, url: string): boolean {
  const target = action.getAttribute('target');
  if (action.hasAttribute('download') || (target && target !== '_self')) return false;
  if (!/^https?:/.test(url)) return false;
  return url.split('#')[0] !== location.href.split('#')[0];
}

function isTransparent(color: string): boolean {
  if (!color || color === 'transparent') return true;
  const probe = document.createElement('div');
  probe.style.backgroundColor = color;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).backgroundColor;
  probe.remove();
  const m = /^rgba?\((.*)\)$/.exec(computed);
  if (!m) return computed === 'transparent';
  const parts = m[1]!.split(/[ ,/]+/).filter(Boolean);
  return parts.length === 4 && Number.parseFloat(parts[3]!) === 0;
}

function prefetch(action: Element, url: string): void {
  const prefetched = shared().prefetched;
  const target = action.getAttribute('target');
  if (prefetched.has(url) || action.hasAttribute('download') || (target && target !== '_self')) {
    return;
  }
  const link = new URL(url);
  if (
    (link.protocol !== 'http:' && link.protocol !== 'https:') ||
    link.origin !== location.origin
  ) {
    return;
  }
  prefetched.add(url);
  const element = document.createElement('link');
  element.rel = 'prefetch';
  element.href = url;
  document.head.appendChild(element);
}

function makeSplash(color: string, tile: Element): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText =
    'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:2147483647;margin:0;box-sizing:border-box;overflow:hidden;' +
    `display:flex;align-items:center;justify-content:center;background:${color};`;
  const template = tile.querySelector(
    ':scope > template[slot="splash"]',
  ) as HTMLTemplateElement | null;
  if (template) el.appendChild(template.content.cloneNode(true));
  return el;
}

export interface TileLaunchStartDetail {
  tile: Element;
  action: Element;
  url: string | null;
  hold(promise: Promise<unknown>): void;
  preventPrefetch(): void;
}

export interface TileLaunchActivateDetail {
  tile: Element;
  action: Element;
  url: string | null;
  hold(promise: Promise<unknown>): void;
}

export interface TileLaunchEndDetail {
  tile: Element;
  action: Element;
  url: string | null;
  reason: 'done' | 'restore';
}

export function startLaunch(
  tile: Element,
  action: Element,
  activate: () => boolean,
  ready: Promise<unknown> | null,
): Promise<void> | null {
  const gate = shared();
  const url =
    action.localName === 'a' && action.hasAttribute('href')
      ? (action as HTMLAnchorElement).href
      : null;
  const holds: Promise<unknown>[] = [];
  const hold = (promise: Promise<unknown>): void => {
    holds.push(Promise.resolve(promise));
  };
  let noPrefetch = false;
  gate.launching.add(tile);
  const start = new CustomEvent<TileLaunchStartDetail>('tilelaunchstart', {
    bubbles: true,
    composed: true,
    cancelable: true,
    detail: {
      tile,
      action,
      url,
      hold,
      preventPrefetch: () => {
        noPrefetch = true;
      },
    },
  });
  tile.dispatchEvent(start);
  if (start.defaultPrevented) {
    gate.launching.delete(tile);
    return null;
  }
  if (url && !noPrefetch) prefetch(action, url);

  return new Promise<void>((resolve) => {
    const motion = tile as MotionTile;
    const reduced = prefersReducedMotion();
    const from = tile.getBoundingClientRect();
    const duration = Math.max(
      1,
      timeOf(tile, '--k-tile-launch-duration', '--ax-tile-launch-duration', DURATION),
    );
    const turnEnd = duration * TURN_SHARE;
    const easing = parseEasing(
      readCssProp(tile, '--k-tile-launch-easing', '--ax-tile-launch-easing'),
      EASING,
    );
    const fade = reduced ? 0 : timeOf(tile, '--k-tile-splash-fade', '--ax-tile-splash-fade', FADE);
    const holdTime = timeOf(tile, '--k-tile-splash-hold', '--ax-tile-splash-hold', SPLASH_HOLD);
    const parsedTimeout = parseTimeout(
      readCssProp(tile, '--k-tile-splash-timeout', '--ax-tile-splash-timeout'),
    );
    const timeout = parsedTimeout === null ? TIMEOUT : parsedTimeout;
    const forced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(forced-colors: active)').matches;
    const resolved =
      readCssProp(tile, '--k-tile-splash-color', '--ax-tile-splash-color') ||
      (forced
        ? 'Canvas'
        : readCssProp(tile, '--k-surface-bg', '--ax-fill-color') ||
          getComputedStyle(tile).backgroundColor);
    const splashColor = isTransparent(resolved) ? '#141416' : resolved;
    const perspective = Math.max(1000, 4 * Math.max(from.width, from.height));
    const depth = perspective / Math.max(1, from.width, from.height);
    const t0 = performance.now();
    let over = false;
    let frame = 0;
    let limit = 0;
    let splash: HTMLElement | null = null;

    const end = (reason: 'done' | 'restore'): void => {
      if (over) return;
      over = true;
      cancelAnimationFrame(frame);
      clearTimeout(limit);
      window.removeEventListener('pageshow', onPageShow);
      if (splash) splash.remove();
      splash = null;
      motion.motion(null);
      gate.launching.delete(tile);
      tile.dispatchEvent(
        new CustomEvent<TileLaunchEndDetail>('tilelaunchend', {
          bubbles: true,
          composed: true,
          detail: { tile, action, url, reason },
        }),
      );
      resolve();
    };

    const onPageShow = (event: PageTransitionEvent): void => {
      if (event.persisted) end('restore');
    };
    window.addEventListener('pageshow', onPageShow);

    const fadeOut = (): void => {
      if (!splash || fade <= 0) {
        end('done');
        return;
      }
      const el = splash;
      const fadeStart = performance.now();
      const step = (): void => {
        const t = Math.min(1, (performance.now() - fadeStart) / fade);
        el.style.opacity = String(1 - t);
        if (t < 1) frame = requestAnimationFrame(step);
        else end('done');
      };
      step();
    };

    const release = (): void => {
      if (holdTime > 0 && splash) limit = window.setTimeout(fadeOut, holdTime);
      else frame = requestAnimationFrame(fadeOut);
    };

    const holdSplash = (navigates: boolean): void => {
      const pending = holds.concat(ready ? [ready] : []);
      if (!pending.length && !navigates) {
        release();
        return;
      }
      let settled = false;
      const settle = (): void => {
        if (settled) return;
        settled = true;
        clearTimeout(limit);
        if (!over) release();
      };
      if (Number.isFinite(timeout)) limit = window.setTimeout(settle, timeout);
      if (pending.length) {
        void Promise.all(pending.map((p) => p.then(noop, noop))).then(settle);
      }
    };

    const activateNow = (): void => {
      tile.dispatchEvent(
        new CustomEvent<TileLaunchActivateDetail>('tilelaunchactivate', {
          bubbles: true,
          composed: true,
          detail: { tile, action, url, hold },
        }),
      );
      const delivered = activate();
      const navigates =
        delivered && Boolean(url) && leavesPage(action, url!) && !holds.length && !ready;
      holdSplash(navigates);
    };

    const rect = (q: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const left = from.left * (1 - q);
      const top = from.top * (1 - q);
      const width = from.width + (w - from.width) * q;
      const height = from.height + (h - from.height) * q;
      return { left, top, width, height, cx: left + width / 2, cy: top + height / 2 };
    };

    const writeTile = (q: number, angle: number, opacity: number): void => {
      const r = rect(q);
      motion.motion({
        rotateY: angle,
        perspective,
        scale: r.height / Math.max(1, from.height),
        x: r.cx - (from.left + from.width / 2),
        y: r.cy - (from.top + from.height / 2),
        opacity,
      });
    };

    const writeSplash = (el: HTMLElement, q: number, angle: number): void => {
      const r = rect(q);
      el.style.left = `${r.left}px`;
      el.style.top = `${r.top}px`;
      el.style.width = `${r.width}px`;
      el.style.height = `${r.height}px`;
      el.style.transform = angle
        ? `perspective(${depth * Math.max(r.width, r.height)}px) rotateY(${angle}deg)`
        : '';
    };

    const tick = (): void => {
      frame = 0;
      if (over) return;
      const elapsed = performance.now() - t0;
      const growStart = duration * GROW_SHARE;
      const q =
        elapsed <= growStart
          ? 0
          : bezierAt(easing, Math.min(1, (elapsed - growStart) / (duration - growStart)));
      if (elapsed < turnEnd) {
        writeTile(q, 90 * bezierAt(TURN_EASING, elapsed / turnEnd), 1);
        frame = requestAnimationFrame(tick);
        return;
      }
      if (!splash) {
        writeTile(bezierAt(easing, (TURN_SHARE - GROW_SHARE) / (1 - GROW_SHARE)), 90, 0);
        splash = makeSplash(splashColor, tile);
        document.body.appendChild(splash);
      }
      const back = Math.min(1, (elapsed - turnEnd) / (duration - turnEnd));
      writeSplash(splash, q, -90 * (1 - bezierAt(SPLASH_TURN_EASING, back)));
      if (elapsed < duration) frame = requestAnimationFrame(tick);
      else activateNow();
    };

    if (reduced) {
      splash = makeSplash(splashColor, tile);
      document.body.appendChild(splash);
      frame = requestAnimationFrame(() => {
        frame = 0;
        activateNow();
      });
    } else {
      tick();
    }
  });
}
