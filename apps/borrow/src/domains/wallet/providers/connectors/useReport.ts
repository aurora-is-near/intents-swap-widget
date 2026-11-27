import { useEffect, useRef } from 'react';

import type { ConnectorReport } from './types';

/**
 * Reports a connector when its `key` changes. The package's connector hooks
 * return new objects every render, so reporting on every render would
 * re-render the session in a loop; `build` runs only when the key moves.
 * `build` returns `null` while the connector is not ready to use.
 */
export const useReport = (
  build: () => ConnectorReport | null,
  key: string,
  onChange: (report: ConnectorReport) => void,
) => {
  const buildRef = useRef(build);

  buildRef.current = build;

  useEffect(() => {
    const report = buildRef.current();

    if (report) {
      onChange(report);
    }
  }, [key, onChange]);
};
