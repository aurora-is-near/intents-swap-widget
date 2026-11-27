import { useNavigate, useSearch } from '@tanstack/react-router';

import { usePositions } from '../../hooks/usePositions';
import { PositionsView } from './PositionsView';

/**
 * The My positions tab: the user's loans (`usePositions`). The route's
 * `position` search param picks the loan shown; picking another replaces
 * the history entry, so Back leaves the tab rather than stepping through
 * picks.
 */
export function PositionsPage() {
  const { status, positions, partial, refetch } = usePositions();
  const { position } = useSearch({ strict: false });
  const navigate = useNavigate();

  return (
    <PositionsView
      partial={partial}
      positions={positions}
      refetch={refetch}
      selectedId={position}
      status={status}
      onSelect={(id) => {
        void navigate({
          to: '/positions',
          search: { position: id },
          replace: true,
          resetScroll: false,
        });
      }}
    />
  );
}
