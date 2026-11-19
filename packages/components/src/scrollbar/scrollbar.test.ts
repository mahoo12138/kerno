import { generateTokensCss } from '@kerno/tokens';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './define.js';
import {
  Glide,
  chase,
  dragTo,
  follow,
  jumpTo,
  layoutAxis,
  markerAnchor,
  markerOffset,
  pageDirection,
  pageStep,
  physical,
  placeCard,
  snapLayout,
  type KScrollView,
  type KScrollbar,
  type MarkerEventDetail,
  type ScrollTarget,
} from './index.js';

let tokenStyle: HTMLStyleElement;

beforeEach(() => {
  tokenStyle = document.createElement('style');
  tokenStyle.textContent = generateTokensCss();
  document.head.append(tokenStyle);
});

afterEach(() => {
  tokenStyle.remove();
  document.body.innerHTML = '';
});

describe('Scrollbar geometry & physics', () => {
  it('computes proportional thumb length, minThumb clamp, travel, ratio, and drag/jump offsets', () => {
    const layout = layoutAxis({
      client: 200,
      size: 1000,
      position: 400,
      track: 200,
      minThumb: 30,
    });
    expect(layout.scrollable).toBe(true);
    expect(layout.max).toBe(800);
    expect(layout.thumbLength).toBe(40);
    expect(layout.travel).toBe(160);
    expect(layout.ratio).toBe(5);
    expect(layout.thumbOffset).toBe(80);

    // minThumb wins when content is very tall
    const minLayout = layoutAxis({
      client: 200,
      size: 20000,
      position: 0,
      track: 200,
      minThumb: 48,
    });
    expect(minLayout.thumbLength).toBe(48);

    // dragTo & jumpTo
    expect(dragTo(layout, 400, 10)).toBe(450);
    expect(jumpTo(layout, 100)).toBe(400);
    expect(pageDirection(layout, 20)).toBe(-1);
    expect(pageDirection(layout, 90)).toBe(0);
    expect(pageDirection(layout, 150)).toBe(1);
    expect(pageStep(200, 40)).toBe(160);

    // Marker math + RTL physical inversion
    const anchor = markerAnchor(500, 200, 800, 0.5);
    expect(anchor).toBe(400);
    expect(markerOffset(layout, anchor, 0.5)).toBe(100);
    expect(physical(20, 40, 200, false)).toBe(20);
    expect(physical(20, 40, 200, true)).toBe(140);

    // Device-pixel snapping
    const snapped = snapLayout({ ...layout, thumbOffset: 10.3, thumbLength: 40.4 }, 0.5, 2);
    expect(Math.round((0.5 + snapped.thumbOffset) * 2)).toBe((0.5 + snapped.thumbOffset) * 2);

    // Card clamping inside viewport
    const cardPos = placeCard(
      { x: 10, y: 10 },
      { width: 120, height: 40 },
      'left',
      10,
      { width: 800, height: 600 },
      4,
    );
    expect(cardPos.left).toBe(4);
    expect(cardPos.top).toBe(4);
  });

  it('approaches target smoothly via chase/follow and yields Glide on external scroll', () => {
    expect(chase(0, 100, 100, 100)).toBeCloseTo(63.21, 1);
    expect(follow(99.995, 100, 16, 100)).toBe(100);

    let pos = 0;
    const mockTarget = {
      position: () => pos,
      client: () => 200,
      size: () => 1000,
      scrollTo: (_axis: 'vertical' | 'horizontal', logical: number) => {
        pos = logical;
      },
    } as unknown as ScrollTarget;

    const glide = new Glide(mockTarget, () => 50);
    glide.by('vertical', 40);
    glide.by('vertical', 40);
    expect(glide.goal('vertical')).toBe(80);
    glide.step(16);
    expect(pos).toBeGreaterThan(0);
    expect(pos).toBeLessThan(80);

    // External scroll yields glide
    pos = 300;
    glide.step(16);
    expect(glide.running).toBe(false);
  });
});

describe('<k-scroll-view> & <k-scrollbar>', () => {
  it('renders overlay scrollbars, forwards scroll API, and manages focus accessibility', async () => {
    document.body.innerHTML = `
      <k-scroll-view indicator="pinned" style="width: 240px; height: 160px">
        <div style="height: 800px; padding: 12px">Scrollable text content</div>
      </k-scroll-view>
    `;
    const view = document.querySelector('k-scroll-view') as KScrollView;
    await view.updateComplete;
    view.flush();

    expect(view.scrollHeight).toBeGreaterThan(700);
    // Text-only region receives tabindex="0" on internal viewport
    expect(view.viewport.getAttribute('tabindex')).toBe('0');

    const vBar = view.shadowRoot!.querySelector<HTMLElement>('.bar.v')!;
    const vThumb = view.shadowRoot!.querySelector<HTMLElement>('.bar.v .thumb')!;
    expect(vBar.style.display).not.toBe('none');
    expect(vBar.dataset.shown).toBe('true');
    expect(Number.parseFloat(vThumb.style.height)).toBeGreaterThanOrEqual(28);
    expect(view.style.getPropertyValue('--k-scrollbar-vertical-size')).toBe('12px');

    // Scroll API forwarding & event re-dispatch
    const onScroll = vi.fn();
    view.addEventListener('scroll', onScroll);
    view.scrollTop = 200;
    expect(view.viewport.scrollTop).toBe(200);
    view.flush();
    expect(vThumb.style.transform).toMatch(/^translate\(0(px)?,\s*[\d.]+px\)$/);

    // Dragging the thumb updates scrollTop directly
    const tRect = vThumb.getBoundingClientRect();
    const tx = tRect.left + tRect.width / 2;
    const ty = tRect.top + tRect.height / 2;
    view.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        button: 0,
        pointerId: 2,
        pointerType: 'mouse',
        clientX: tx,
        clientY: ty,
      }),
    );
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId: 2,
        pointerType: 'mouse',
        clientX: tx,
        clientY: ty + 30,
      }),
    );
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId: 2,
        pointerType: 'mouse',
        clientX: tx,
        clientY: ty + 30,
      }),
    );
    expect(view.scrollTop).toBeGreaterThan(250);

    // Adding a focusable button inside removes redundant viewport tabindex
    const btn = document.createElement('button');
    btn.textContent = 'Action';
    view.append(btn);
    await Promise.resolve();
    expect(view.viewport.hasAttribute('tabindex')).toBe(false);
  });

  it('collects markers via marker-selector, merges nearby marks, and activates via pointer', async () => {
    document.body.innerHTML = `
      <k-scroll-view
        indicator="pinned"
        marker-selector="h3"
        style="width: 260px; height: 180px; --k-scrollbar-scroll-smoothing: 0ms; --k-scrollbar-thumb-smoothing: 0ms"
      >
        <div style="height: 1200px; position: relative">
          <h3 id="sec-a" style="position: absolute; top: 0; margin: 0">Alpha</h3>
          <h3 id="sec-b" style="position: absolute; top: 600px; margin: 0">Beta</h3>
          <h3 id="sec-c" style="position: absolute; top: 1100px; margin: 0">Gamma</h3>
        </div>
      </k-scroll-view>
    `;
    const view = document.querySelector('k-scroll-view') as KScrollView;
    await view.updateComplete;
    view.flush();

    const markerEls = view.shadowRoot!.querySelectorAll<HTMLElement>('.bar.v .marker');
    expect(markerEls.length).toBe(3);
    expect(markerEls[0]!.getAttribute('data-id')).toBe('sec-a');
    expect(markerEls[0]!.hasAttribute('current')).toBe(true);

    // Click the second marker via geometry pointer routing
    const activated: MarkerEventDetail[] = [];
    view.addEventListener('k-marker-activate', (e) => {
      activated.push((e as CustomEvent<MarkerEventDetail>).detail);
    });

    const mRect = markerEls[1]!.getBoundingClientRect();
    const cx = mRect.left + mRect.width / 2;
    const cy = mRect.top + mRect.height / 2;
    view.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: cx,
        clientY: cy,
      }),
    );
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: cx,
        clientY: cy,
      }),
    );
    view.flush();

    expect(activated).toHaveLength(1);
    expect(activated[0]!.marker.id).toBe('sec-b');
    expect(view.scrollTop).toBeGreaterThan(400);
  });

  it('enforces <k-scrollbar> singleton, injects document hide style, and honors suspended', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.innerHTML = `<k-scrollbar indicator="pinned"></k-scrollbar>`;
    const first = document.querySelector('k-scrollbar') as KScrollbar;
    await first.updateComplete;
    first.flush();

    expect(document.getElementById('k-scrollbar-document-hide')).not.toBeNull();

    // Second instance warns and stays inert
    const second = document.createElement('k-scrollbar') as KScrollbar;
    document.body.append(second);
    await second.updateComplete;
    expect(warn).toHaveBeenCalledOnce();

    // Suspending hides bars
    first.suspended = true;
    await first.updateComplete;
    first.flush();
    expect(first.getAttribute('indicator-state')).toBe('none');

    // Removing first cleans up injected document hide style
    first.remove();
    second.remove();
    expect(document.getElementById('k-scrollbar-document-hide')).toBeNull();
    warn.mockRestore();
  });
});
