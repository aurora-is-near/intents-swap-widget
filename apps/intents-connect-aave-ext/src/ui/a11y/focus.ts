/** Elements that can take focus, before checking whether they may. */
const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  'iframe',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

const isVisible = (element: HTMLElement) =>
  // Without layout (jsdom), everything counts as visible: `hidden` and
  // `inert` still rule elements out below.
  typeof element.checkVisibility === 'function'
    ? element.checkVisibility()
    : true;

const isTabbable = (element: HTMLElement) =>
  !(element as HTMLButtonElement).disabled &&
  element.tabIndex >= 0 &&
  !element.closest('[inert], [hidden]') &&
  isVisible(element);

/**
 * What Tab moves through inside `container`, in document order: enabled,
 * visible, not `tabindex="-1"`, not inside an `inert` or `hidden` subtree.
 * Nested shadow roots aren't entered (the modal has none).
 */
export const tabbables = (container: ParentNode): HTMLElement[] =>
  [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(isTabbable);

/**
 * The element that has focus, through shadow roots: `document.activeElement`
 * stops at a shadow host.
 */
export const deepActiveElement = (
  root: Document | ShadowRoot = document,
): Element | null => {
  let active = root.activeElement;

  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }

  return active;
};

/** Focus is nowhere in particular: on `<body>`, or on nothing. */
export const focusIsLost = (active: Element | null) =>
  !active || active === document.body || (active as HTMLButtonElement).disabled;
