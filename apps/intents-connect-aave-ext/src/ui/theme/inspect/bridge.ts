import { useEffect, useSyncExternalStore } from 'react';

import type { SupplyTheme } from '../resolve';
import { themeConfig } from './config';
import {
  type InspectedTheme,
  inspectorStore,
  type SeedEdits,
  THEME_INSPECTOR,
} from './store';

const NO_EDITS: SeedEdits = {};

/** The inspector's seed edits; none in builds without it. */
export const useSeedEdits: () => SeedEdits = THEME_INSPECTOR
  ? () => useSyncExternalStore(inspectorStore.subscribe, inspectorStore.edits)
  : () => NO_EDITS;

/** Shows the inspector what the modal applies, in builds with it. */
export const useInspected: (inspected: InspectedTheme) => void = THEME_INSPECTOR
  ? ({ theme, reading, tokens }) => {
      useEffect(() => {
        inspectorStore.publish({ theme, reading, tokens });
      }, [theme, reading, tokens]);
    }
  : () => {};

/**
 * `theme` as the inspector's config makes it (`themeConfig`): edits pinned
 * for the page reader, which reads the page again with them, so the modal
 * shows what the copied config gives. `theme` itself without edits.
 */
export const withEdits = (
  theme: SupplyTheme | undefined,
  edits: SeedEdits,
): SupplyTheme | undefined =>
  Object.keys(edits).length ? themeConfig(theme, edits) : theme;
