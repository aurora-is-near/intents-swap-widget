import { type RefObject, useEffect, useRef } from 'react';

import { deepActiveElement, focusIsLost, tabbables } from './focus';

type FocusTrapOptions = {
  active: boolean;
  /** Focused when the trap starts; else the first tabbable element. */
  initialFocus?: RefObject<HTMLElement | null>;
  /**
   * Where focus lands when the focused element disappears or is disabled
   * (a screen change, a pressed button turning busy); else the container.
   */
  fallbackFocus?: RefObject<HTMLElement | null>;
  /**
   * Where focus goes back when the trap ends and the element focused before
   * it is gone: e.g. the page's own button that opens the modal.
   */
  returnFocus?: () => HTMLElement | null | undefined;
};

const focus = (element: HTMLElement | null | undefined) =>
  element?.focus({ preventScroll: true });

/** `node` comes after `reference` in document order. */
const follows = (reference: Node, node: Node) =>
  // eslint-disable-next-line no-bitwise -- the API returns a bit mask
  (reference.compareDocumentPosition(node) &
    Node.DOCUMENT_POSITION_FOLLOWING) !==
  0;

/**
 * Keeps keyboard focus inside `container` while `active`, inside a shadow
 * root as well as in the document:
 * - Tab and Shift+Tab move through its tabbable elements and wrap. Every
 *   press is handled here, in document order, since the browser's own
 *   order and test tools' can't be relied on across a shadow boundary.
 * - Focus that falls out (its element was removed or disabled) comes back
 *   to `fallbackFocus`. Focus that moves outside on purpose is left alone:
 *   the page itself is inert (useModalPage), so that's a wallet's own
 *   in-page prompt or the theme inspector.
 * - When it ends, focus returns to what had it before (the opener), or to
 *   `returnFocus()` when that's gone.
 *
 * The container needs `tabIndex={-1}` if it may receive focus itself.
 */
export const useFocusTrap = (
  containerRef: RefObject<HTMLElement | null>,
  { active, initialFocus, fallbackFocus, returnFocus }: FocusTrapOptions,
) => {
  const options = useRef({ initialFocus, fallbackFocus, returnFocus });

  options.current = { initialFocus, fallbackFocus, returnFocus };

  useEffect(() => {
    const container = containerRef.current;

    if (!active || !container) {
      return undefined;
    }

    const opener = deepActiveElement();
    const rescue = () =>
      focus(options.current.fallbackFocus?.current ?? container);

    focus(
      options.current.initialFocus?.current ??
        tabbables(container)[0] ??
        container,
    );

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.defaultPrevented) {
        return;
      }

      event.preventDefault();

      const items = tabbables(container);

      if (!items.length) {
        rescue();

        return;
      }

      const current = deepActiveElement();
      const index = items.indexOf(current as HTMLElement);
      // From something that isn't tabbable (the dialog, its heading), go to
      // the first tabbable after it, or the last before it.
      const position =
        index >= 0
          ? index
          : items.findIndex((item) => !!current && follows(current, item));

      let next: HTMLElement | undefined;

      if (event.shiftKey) {
        // The tabbable before: the previous one, or for a non-tabbable
        // element, the one before the first that follows it.
        let before = position - 1;

        if (index < 0 && position < 0) {
          before = items.length - 1;
        }

        next = before >= 0 ? items[before] : items.at(-1);
      } else if (index >= 0) {
        next = items[(index + 1) % items.length];
      } else {
        next = position >= 0 ? items[position] : items[0];
      }

      focus(next);
    };

    // Focus that fell out: its element was removed, hidden or disabled.
    // Browsers move it to `<body>` without an event, so check after every
    // change to the container.
    let checking = false;
    const check = () => {
      if (checking) {
        return;
      }

      checking = true;
      queueMicrotask(() => {
        checking = false;

        if (focusIsLost(deepActiveElement())) {
          rescue();
        }
      });
    };

    const observer = new MutationObserver(check);

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'hidden', 'inert'],
    });
    container.addEventListener('keydown', onKeyDown);

    return () => {
      observer.disconnect();
      container.removeEventListener('keydown', onKeyDown);

      // After every cleanup of this commit: the page stops being inert in
      // its own (useModalPage), and an inert element can't take focus.
      setTimeout(() => {
        const target =
          opener instanceof HTMLElement &&
          opener.isConnected &&
          opener !== document.body
            ? opener
            : options.current.returnFocus?.();

        focus(target);
      }, 0);
    };
  }, [active, containerRef]);
};
