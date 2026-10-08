import { useUnsafeSnapshot } from '@aurora-is-near/intents-swap-widget';

import { Tabs } from '../../components/Tabs';
import { useNavigation } from '../../navigation';

const TABS = [
  ['send', 'Send'],
  ['swap', 'Swap'],
] as const;

/**
 * Switches between Send and Swap in place (back still goes to Home), keeping
 * the token being sent or sold.
 */
export const TransferTabs = ({ value }: { value: 'send' | 'swap' }) => {
  const { replace } = useNavigation();
  const { ctx } = useUnsafeSnapshot();

  return (
    <Tabs
      label="Send or swap"
      tabs={TABS}
      value={value}
      onChange={(tab) => {
        if (tab !== value) {
          replace({ name: tab, source: ctx.sourceToken });
        }
      }}
    />
  );
};
