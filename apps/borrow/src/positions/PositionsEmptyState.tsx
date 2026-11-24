import { Button, Card } from '@aurora-is-near/ui-kit';
import { useIntentsConnectWallet } from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import { useNavigate } from '@tanstack/react-router';
import { useId } from 'react';

import { useFocusTab } from '../shell/tabFocus';
import { useConnectWallet } from '../wallet/useConnectWallet';

/**
 * The My positions card when there is nothing to list
 * (Web-Positions-NotConnected.dc.html lines 393–398, copy line 1438):
 * `.card` at max-width 560 at the column's left edge with its text centred
 * (the artboard sets no auto margin), padding 48px 28px at every width (the
 * inline padding wins over the 640px block's); title 26px / 800, tracking
 * -0.02em; text 16px `mut`, margin 8px 0 22px; the button is `.go` at
 * `padding:14px 26px;font-size:17px`, the kit's `md` size. The artboard
 * sets no line-height, so the browser's `normal` holds, not preflight's 1.5.
 *
 * Disconnected it asks to connect; connected, it points to New loan, and
 * focus moves to the New loan tab, since this button unmounts with the panel.
 * Copy as drawn (decided; revisit before launch).
 */
export function PositionsEmptyState() {
  const { isConnected } = useIntentsConnectWallet();
  const connectWallet = useConnectWallet();
  const navigate = useNavigate();
  const focusTab = useFocusTab();
  const titleId = useId();

  const content = isConnected
    ? {
        title: 'No positions right now',
        text: 'Make a loan and it will show up here with its LTV, health and repay options.',
        action: 'Make a loan',
        onClick: () => {
          void navigate({ to: '/', resetScroll: false }).then(() => {
            focusTab('/');
          });
        },
      }
    : {
        title: 'Connect your wallet',
        text: 'Connect to see your loans across Morpho, Aave and Spark.',
        action: 'Connect wallet',
        onClick: connectWallet,
      };

  return (
    <Card
      aria-labelledby={titleId}
      className="max-w-[560px] px-[28px] py-[48px] text-center"
      role="region">
      <h2
        className="m-0 text-[26px] leading-[normal] font-extrabold tracking-[-0.02em]"
        id={titleId}>
        {content.title}
      </h2>
      <p className="mt-[8px] mb-[22px] text-[16px] leading-[normal] text-mut">
        {content.text}
      </p>
      <Button onClick={content.onClick} size="md">
        {content.action}
      </Button>
    </Card>
  );
}
