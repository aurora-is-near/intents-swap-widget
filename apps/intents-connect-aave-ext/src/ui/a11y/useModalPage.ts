import { useEffect } from 'react';

/** Marks our own hosts (the modal, the theme inspector): never made inert. */
const OURS = '[data-aurora-intents]';

/** Not rendered: no point marking them. */
const UNRENDERED = new Set(['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE', 'NOSCRIPT']);

/**
 * While `active`, the page behind a modal is out of reach: the top-level
 * elements of `<body>` get `inert` (no focus, no clicks, hidden from screen
 * readers), and `<html>` stops scrolling.
 *
 * Only what's on the page when the modal opens: elements added afterwards
 * are left alone, since a wallet may open its own prompt in the page while
 * the modal waits on it. Our own hosts and elements already inert are
 * skipped, and exactly what was changed is restored.
 */
export const useModalPage = (active: boolean) => {
  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const marked = [...document.body.children].filter(
      (element) =>
        !UNRENDERED.has(element.tagName) &&
        !element.matches(OURS) &&
        !element.hasAttribute('inert'),
    );

    marked.forEach((element) => element.setAttribute('inert', ''));

    const html = document.documentElement;
    const { overflow, scrollbarGutter } = html.style;

    // The gutter keeps its width, so the page doesn't shift sideways when
    // its scrollbar goes.
    html.style.overflow = 'hidden';
    html.style.scrollbarGutter = 'stable';

    return () => {
      marked.forEach((element) => element.removeAttribute('inert'));
      html.style.overflow = overflow;
      html.style.scrollbarGutter = scrollbarGutter;
    };
  }, [active]);
};
