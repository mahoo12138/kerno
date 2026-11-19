/**
 * WCAG 2.1.1 keyboard accessibility for scroll views: sets `tabindex="0"` on
 * the internal `.viewport` only while no focusable descendant exists inside
 * the host, so text-only regions remain keyboard-scrollable without introducing
 * extra Tab stops around interactive content.
 */
const NATIVE_FOCUSABLE =
  'a[href], button, input, select, textarea, summary, iframe, audio[controls], video[controls]';
const CANDIDATES = `${NATIVE_FOCUSABLE}, [tabindex], [contenteditable]`;
const FOCUS_ATTRIBUTES = ['tabindex', 'href', 'disabled', 'contenteditable', 'controls', 'type'];

function takesFocus(el: Element): boolean {
  const tab = el.getAttribute('tabindex');
  const index = tab === null ? Number.NaN : Number.parseInt(tab, 10);
  if (index < 0) return false;
  if (el.matches(':disabled') || el.matches('input[type="hidden"]')) return false;
  return (
    !Number.isNaN(index) ||
    el.matches(NATIVE_FOCUSABLE) ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}

function hasFocusableContent(host: Element): boolean {
  const list = host.querySelectorAll(CANDIDATES);
  for (let i = 0; i < list.length; i++) {
    if (takesFocus(list[i]!)) return true;
  }
  return false;
}

export function watchFocus(host: Element, viewport: HTMLElement): () => void {
  const sync = (): void => {
    if (hasFocusableContent(host)) viewport.removeAttribute('tabindex');
    else viewport.setAttribute('tabindex', '0');
  };
  const observer = new MutationObserver(sync);
  observer.observe(host, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: FOCUS_ATTRIBUTES,
  });
  sync();
  return () => observer.disconnect();
}
