import type { Axis } from './types.js';

export interface ViewportBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ScrollTarget {
  readonly scroller: HTMLElement;
  readonly scrollEvents: EventTarget;
  readonly pointerArea: EventTarget;
  readonly isDocument: boolean;
  rtl(): boolean;
  refreshDirection(): void;
  position(axis: Axis): number;
  client(axis: Axis): number;
  size(axis: Axis): number;
  scrollTo(axis: Axis, logical: number): void;
  holdInstant(on: boolean): void;
  contentOffset(el: Element, axis: Axis, viewport?: ViewportBox, position?: number): number;
  viewport(): ViewportBox;
}

class Target implements ScrollTarget {
  #direction: boolean | null = null;
  #held: (() => void) | null = null;

  constructor(
    readonly scroller: HTMLElement,
    readonly scrollEvents: EventTarget,
    readonly pointerArea: EventTarget,
    readonly isDocument: boolean,
    private readonly box: HTMLElement,
  ) {}

  rtl(): boolean {
    if (this.#direction === null) {
      this.#direction = getComputedStyle(this.scroller).direction === 'rtl';
    }
    return this.#direction;
  }

  refreshDirection(): void {
    this.#direction = null;
  }

  position(axis: Axis): number {
    if (axis === 'vertical') return this.scroller.scrollTop;
    return this.rtl() ? 0 - this.scroller.scrollLeft : this.scroller.scrollLeft;
  }

  client(axis: Axis): number {
    return axis === 'vertical' ? this.box.clientHeight : this.box.clientWidth;
  }

  size(axis: Axis): number {
    return axis === 'vertical' ? this.scroller.scrollHeight : this.scroller.scrollWidth;
  }

  scrollTo(axis: Axis, logical: number): void {
    const horizontal = axis === 'horizontal';
    const value = horizontal && this.rtl() ? 0 - logical : logical;
    // Override author `scroll-behavior: smooth` during direct writes so our
    // own drag & glide physics never fight the browser's CSS smooth scrolling.
    const restore = this.#held ? null : this.#forceInstant();
    if (this.isDocument) {
      if (horizontal) window.scrollTo(value, window.scrollY);
      else window.scrollTo(window.scrollX, value);
    } else if (horizontal) {
      this.scroller.scrollLeft = value;
    } else {
      this.scroller.scrollTop = value;
    }
    restore?.();
  }

  holdInstant(on: boolean): void {
    if (on && !this.#held) {
      this.#held = this.#forceInstant();
    } else if (!on && this.#held) {
      this.#held();
      this.#held = null;
    }
  }

  #forceInstant(): () => void {
    const style = (this.isDocument ? document.documentElement : this.scroller).style;
    const value = style.getPropertyValue('scroll-behavior');
    const priority = style.getPropertyPriority('scroll-behavior');
    style.setProperty('scroll-behavior', 'auto', 'important');
    return () => {
      if (value) style.setProperty('scroll-behavior', value, priority);
      else style.removeProperty('scroll-behavior');
    };
  }

  contentOffset(
    el: Element,
    axis: Axis,
    v: ViewportBox = this.viewport(),
    position: number = this.position(axis),
  ): number {
    const r = el.getBoundingClientRect();
    if (axis === 'vertical') return r.top - v.top + position;
    if (!this.rtl()) return r.left - v.left + position;
    return v.left + v.width - r.right + position;
  }

  viewport(): ViewportBox {
    if (this.isDocument) {
      return { left: 0, top: 0, width: this.box.clientWidth, height: this.box.clientHeight };
    }
    const r = this.scroller.getBoundingClientRect();
    return {
      left: r.left + this.scroller.clientLeft,
      top: r.top + this.scroller.clientTop,
      width: this.scroller.clientWidth,
      height: this.scroller.clientHeight,
    };
  }
}

export function elementTarget(viewport: HTMLElement, host: HTMLElement): ScrollTarget {
  return new Target(viewport, viewport, host, false, viewport);
}

export function documentTarget(): ScrollTarget {
  const scroller = (document.scrollingElement || document.documentElement) as HTMLElement;
  return new Target(scroller, window, document, true, document.documentElement);
}
