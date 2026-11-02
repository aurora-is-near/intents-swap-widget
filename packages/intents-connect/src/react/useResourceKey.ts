import { useEffect } from 'react';
import { proxy } from 'valtio/vanilla';
import { useSnapshot } from 'valtio';

import type { ResourceCache, ResourceState } from '@/resource';

/** Shown while there is no key (no wallet, not authorized…). */
const IDLE = proxy<ResourceState<never>>({ status: 'idle' });

/**
 * Subscribes to the cached resource for `key`, loads it, and re-loads it
 * every `refreshIntervalMs` while the page is visible. `undefined` disables
 * everything and reads as idle.
 */
export const useResourceKey = <T>(
  cache: ResourceCache<T>,
  key: string | undefined,
  refreshIntervalMs: number,
) => {
  const resource = key ? cache.get(key) : undefined;
  const snapshot = useSnapshot(resource?.state ?? IDLE);

  // `resource` is a dependency, not just `key`: when the provider rebuilds
  // its stores (a different intents-api identity) the same key maps to a
  // fresh, idle resource that must be loaded.
  useEffect(() => {
    if (!key || !resource) {
      return undefined;
    }

    const load = () => resource.refresh(key);

    void load();

    if (!refreshIntervalMs) {
      return undefined;
    }

    const interval = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) {
        void load();
      }
    }, refreshIntervalMs);

    return () => clearInterval(interval);
  }, [key, resource, refreshIntervalMs]);

  return {
    snapshot,
    refresh: () =>
      key && resource ? resource.refresh(key) : Promise.resolve(undefined),
  };
};
