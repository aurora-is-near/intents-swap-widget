import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Below this the list is too cramped to be worth scrolling inside, and the page
 * is allowed to scroll instead. Roughly a row and a half, so the cut-off row
 * still signals there is more below.
 */
const MIN_HEIGHT = 120;

/** Breathing room between the list and the bottom edge of the window. */
const BOTTOM_PADDING = 24;

/**
 * Space the page reserves under `element` — an ancestor's bottom margin or
 * padding, a footer. Walking the ancestors is deliberate: `scrollHeight` is
 * floored at the viewport height, so deriving this from the document would
 * overstate it whenever the page does not overflow, and the height would settle
 * at a fixed point that never grows back.
 *
 * A bottom margin sits outside the parent's box when margins collapse and
 * inside it when they don't, so each level takes whichever is larger rather
 * than counting both.
 */
const reservedBelow = (element: HTMLElement) => {
  let total = 0;
  let node: HTMLElement = element;

  while (node !== document.body && node.parentElement) {
    const parent = node.parentElement;
    const gap =
      parent.getBoundingClientRect().bottom -
      node.getBoundingClientRect().bottom;

    const margin = parseFloat(getComputedStyle(node).marginBottom) || 0;

    total += Math.max(gap, margin);
    node = parent;
  }

  return total;
};

/**
 * Height that fills the window from the element's top edge down to the bottom,
 * so the list scrolls inside itself instead of growing the page.
 *
 * Recomputed on `deps` because the element's top moves whenever anything above
 * it changes — collapsing the section, a banner appearing, the wallet
 * connecting.
 */
export const useAvailableHeight = (
  ref: RefObject<HTMLElement | null>,
  isEnabled: boolean,
  deps: unknown[] = [],
) => {
  const [height, setHeight] = useState<number>();

  const measure = useCallback(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    // visualViewport tracks the on-screen area on mobile, where the browser
    // chrome and keyboard eat into innerHeight.
    const viewport = window.visualViewport?.height ?? window.innerHeight;

    // A hidden or not-yet-laid-out tab reports zero. Measuring then would pin
    // the list to MIN_HEIGHT until the next resize, so wait for a real value.
    if (viewport === 0) {
      return;
    }

    const { top } = element.getBoundingClientRect();

    // Space already reserved under the list doubles as its bottom padding when
    // it is the larger of the two; ignoring it would leave the page scrolling
    // by exactly that much, which is the double scrollbar this hook prevents.
    const padding = Math.max(BOTTOM_PADDING, reservedBelow(element));

    setHeight(Math.max(MIN_HEIGHT, viewport - top - padding));
  }, [ref]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    measure();

    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);

    return () => {
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, [measure, isEnabled, ...deps]);

  return height;
};
