let idCounter = 0;

/** Document-unique id, e.g. for `aria-labelledby` wiring. */
export function uniqueId(prefix = 'k'): string {
  return `${prefix}-${(++idCounter).toString(36)}`;
}

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button',
  'input',
  'select',
  'textarea',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

function isHidden(el: HTMLElement): boolean {
  if (el.hidden || el.closest('[inert]')) return true;
  if (typeof el.checkVisibility === 'function') return !el.checkVisibility();
  return el.getClientRects().length === 0;
}

/** Whether an element takes part in sequential (Tab) focus navigation. */
export function isTabbable(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement) || !el.matches(FOCUSABLE)) return false;
  if (el.tabIndex < 0 || el.matches(':disabled')) return false;
  // Hosts that delegate focus are skipped; their inner targets are collected instead.
  if (el.shadowRoot?.delegatesFocus) return false;
  return !isHidden(el);
}

/**
 * Tabbable elements in composed-tree order, descending into open shadow roots
 * and following slot assignments. Basis for focus traps and roving focus.
 */
export function getTabbableElements(root: Element | ShadowRoot | Document): HTMLElement[] {
  const result: HTMLElement[] = [];

  const visit = (node: Node): void => {
    if (node instanceof Element) {
      if (isTabbable(node)) result.push(node);
      if (node instanceof HTMLSlotElement) {
        node.assignedElements({ flatten: true }).forEach(visit);
        if (node.assignedNodes().length > 0) return;
      }
      if (node.shadowRoot) {
        visit(node.shadowRoot);
        return;
      }
    }
    for (const child of node.childNodes) visit(child);
  };

  visit(root);
  return result;
}

/** The deepest focused element, piercing open shadow roots. */
export function getActiveElement(root: Document | ShadowRoot = document): Element | null {
  let active = root.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}
