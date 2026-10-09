import { useCallback, useEffect, useState } from 'react';

import { APP_LAUNCH_KEY } from '../../shared/bridge';
import type { AppLaunch } from '../../shared/bridge';

/** A launch the panel didn't pick up in time is stale (e.g. opened later). */
const MAX_AGE_MS = 60_000;

const session = () => globalThis.chrome?.storage?.session;

const fresh = (value: unknown): AppLaunch | null => {
  const launch = value as AppLaunch | undefined;

  return launch && Date.now() - launch.at < MAX_AGE_MS ? launch : null;
};

/**
 * An app a site's "Deposit with Aurora" button asked the panel to open, left
 * by the background in `storage.session`. Picked up on load and while open.
 */
export const useAppLaunch = () => {
  const [launch, setLaunch] = useState<AppLaunch | null>(null);

  useEffect(() => {
    const storage = session();

    if (!storage) {
      return;
    }

    void storage.get(APP_LAUNCH_KEY).then((stored) => {
      setLaunch(fresh(stored[APP_LAUNCH_KEY]));
    });

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      const change = changes[APP_LAUNCH_KEY];

      if (area === 'session' && change) {
        setLaunch(fresh(change.newValue));
      }
    };

    chrome.storage.onChanged.addListener(onChanged);

    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  /** Handled: forget it, so a reopened panel doesn't act on it again. */
  const consume = useCallback(() => {
    setLaunch(null);
    void session()?.remove(APP_LAUNCH_KEY);
  }, []);

  return { launch, consume };
};
