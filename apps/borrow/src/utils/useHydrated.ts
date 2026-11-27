import { useSyncExternalStore } from 'react';

const noSubscription = () => () => {};

/**
 * False while the prerendered page hydrates (and in the prerender), then
 * true: for what the prerender cannot know or cannot render, drawn as the
 * prerender did first, then re-rendered for real.
 */
export const useHydrated = () =>
  useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
