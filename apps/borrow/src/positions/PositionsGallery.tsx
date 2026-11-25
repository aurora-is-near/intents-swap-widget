import { useId, useState } from 'react';

import {
  ACTIVE_POSITION,
  AT_RISK_POSITION,
  OWNER_READ_ERROR,
  READ_ONLY_POSITION,
  REPAID_POSITION,
} from './positionFixtures';
import { PositionsView } from './PositionsPage';
import type { LoanPosition } from './types';
import type { PositionsReadError } from './usePositions';

/*
 * Every My positions state on the dev-only /gallery, from fixtures, to
 * compare with the artboards (Web-/Mob-Positions-NotConnected, -Empty,
 * Position, Position-Two, Positions-Multi, Position-AtRisk and Web-/Mob-
 * Repaid.dc.html) at 1280 and 420px, in both themes (the gallery's theme
 * switch). Retry does nothing here.
 */

type Entry = {
  label: string;
  positions: readonly LoanPosition[];
  isLoading?: boolean;
  errors?: readonly PositionsReadError[];
  connected?: boolean;
};

const ENTRIES: readonly Entry[] = [
  { label: 'Not connected', positions: [], connected: false },
  { label: 'Loading', positions: [], isLoading: true },
  { label: 'Error', positions: [], errors: [OWNER_READ_ERROR] },
  {
    label: 'Partial error',
    positions: [ACTIVE_POSITION],
    errors: [OWNER_READ_ERROR],
  },
  { label: 'Empty', positions: [], connected: true },
  { label: 'One loan', positions: [ACTIVE_POSITION] },
  { label: 'Two loans', positions: [ACTIVE_POSITION, REPAID_POSITION] },
  {
    label: 'Multi',
    positions: [
      ACTIVE_POSITION,
      AT_RISK_POSITION,
      REPAID_POSITION,
      READ_ONLY_POSITION,
    ],
  },
  { label: 'At risk', positions: [AT_RISK_POSITION] },
  { label: 'Repaid', positions: [REPAID_POSITION] },
  { label: 'Read-only', positions: [READ_ONLY_POSITION] },
];

/** One state, under its name; its summary picks are its own. */
function GalleryEntry({
  label,
  positions,
  isLoading,
  errors,
  connected,
}: Entry) {
  const headingId = useId();
  const [selectedId, setSelectedId] = useState<string>();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 className="m-0 text-sm font-semibold text-mut" id={headingId}>
        {label}
      </h3>
      <PositionsView
        connected={connected}
        errors={errors ?? []}
        isLoading={isLoading ?? false}
        positions={positions}
        selectedId={selectedId}
        onRetry={() => {}}
        onSelect={setSelectedId}
      />
    </section>
  );
}

export function PositionsGallery() {
  return (
    <section
      aria-labelledby="positions-states"
      className="flex flex-col gap-8 bg-sf p-6 font-sans text-ink">
      <h2
        className="m-0 text-xs font-semibold tracking-[0.14em] text-mut2 uppercase"
        id="positions-states">
        My positions
      </h2>
      {ENTRIES.map((entry) => (
        <GalleryEntry key={entry.label} {...entry} />
      ))}
    </section>
  );
}
