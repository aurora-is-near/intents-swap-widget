import { useNavigate } from '@tanstack/react-router';

import { useFocusTab } from '@/shell/tabFocus';
import { useConnectWallet } from '@/domains/wallet/hooks/useConnectWallet';
import { useWallet } from '@/domains/wallet/hooks/useWallet';

import { PositionsMessageCard } from '../PositionsMessageCard/PositionsMessageCard';

/**
 * The My positions card when there is nothing to list
 * (Web-Positions-NotConnected.dc.html, copy line 1438).
 *
 * Disconnected it asks to connect; connected, it points to New loan, and
 * focus moves to the New loan tab, since this button unmounts with the panel.
 * Copy as drawn (decided; revisit before launch).
 */
export function PositionsEmptyState() {
  const { isConnected } = useWallet();
  const connectWallet = useConnectWallet();
  const navigate = useNavigate();
  const focusNewLoan = useFocusTab();

  const content = isConnected
    ? {
        title: 'No positions right now',
        text: 'Make a loan and it will show up here with its LTV, health and repay options.',
        action: 'Make a loan',
        onAction: () => {
          void navigate({ to: '/', resetScroll: false }).then(() => {
            focusNewLoan();
          });
        },
      }
    : {
        title: 'Connect your wallet',
        text: 'Connect to see your loans across Morpho, Aave and Spark.',
        action: 'Connect wallet',
        onAction: connectWallet,
      };

  return <PositionsMessageCard {...content} />;
}
