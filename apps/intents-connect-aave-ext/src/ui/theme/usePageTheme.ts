import { useEffect, useState } from 'react';

import {
  type PageThemeHints,
  type PageThemeReading,
  readPageTheme,
} from './read';

/** Changes this close together are read once. */
const REREAD_DELAY_MS = 300;

/** A reading, or `undefined` if the page couldn't be read at all. */
export const safeReadPageTheme = (
  hints: PageThemeHints,
): PageThemeReading | undefined => {
  try {
    return readPageTheme(document, hints);
  } catch {
    return undefined;
  }
};

const keyOf = (reading: PageThemeReading | undefined) =>
  JSON.stringify(reading?.seed ?? null);

/**
 * Reads the page again when it may have changed its theme: an attribute of
 * `<html>` or `<body>` (a `dark` class, `data-theme`, a style) or the OS
 * color scheme. Calls `onChange` only when the seed differs from `last`.
 * Returns the cleanup.
 */
const watchPageTheme = (
  hints: PageThemeHints,
  onChange: (reading: PageThemeReading | undefined) => void,
  last?: PageThemeReading,
): (() => void) => {
  let previous = keyOf(last);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const reread = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const reading = safeReadPageTheme(hints);
      const key = keyOf(reading);

      if (key !== previous) {
        previous = key;
        onChange(reading);
      }
    }, REREAD_DELAY_MS);
  };

  const observer = new MutationObserver(reread);

  observer.observe(document.documentElement, { attributes: true });

  if (document.body) {
    observer.observe(document.body, { attributes: true });
  }

  const scheme = window.matchMedia?.('(prefers-color-scheme: dark)');

  scheme?.addEventListener?.('change', reread);

  return () => {
    clearTimeout(timer);
    observer.disconnect();
    scheme?.removeEventListener?.('change', reread);
  };
};

/**
 * The host page's theme, read when the modal first renders (so it opens in
 * it, with no flash of the defaults), again when `hints` change (a new
 * theme, or the inspector's pins), and whenever the page changes it.
 * `hints` should be stable; `undefined` turns reading off.
 */
export const usePageTheme = (
  hints: PageThemeHints | undefined,
): PageThemeReading | undefined => {
  const [state, setState] = useState(() => ({
    hints,
    reading: hints ? safeReadPageTheme(hints) : undefined,
  }));

  let { reading } = state;

  if (state.hints !== hints) {
    reading = hints ? safeReadPageTheme(hints) : undefined;
    setState({ hints, reading });
  }

  useEffect(() => {
    if (!hints) {
      return undefined;
    }

    return watchPageTheme(
      hints,
      (next) => setState({ hints, reading: next }),
      reading,
    );
    // `reading` only seeds the comparison: watching restarts with `hints`.
  }, [hints]);

  return reading;
};
