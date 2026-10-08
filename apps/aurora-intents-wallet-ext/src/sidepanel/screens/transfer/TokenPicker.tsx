import { TokensModal } from '@aurora-is-near/intents-swap-widget';
import type { ChainsFilter, Token } from '@aurora-is-near/intents-swap-widget';

type Props = {
  variant: 'source' | 'target';
  chainsFilter: ChainsFilter;
  showChainsSelector?: boolean;
  onSelect: (token: Token) => void;
  onClose: () => void;
};

/** The widget's token list (search, networks, balances) as a whole screen. */
export const TokenPicker = ({
  variant,
  chainsFilter,
  showChainsSelector = true,
  onSelect,
  onClose,
}: Props) => (
  <div className="sw token-picker flex h-screen flex-col bg-sw-gray-950 p-sw-md text-sw-gray-50">
    <TokensModal
      showBalances
      variant={variant}
      groupTokens={false}
      showChainsSelector={showChainsSelector}
      chainsFilter={chainsFilter}
      className="min-h-[0px] flex-1 pb-sw-2xl"
      onMsg={(msg) => {
        if (msg.type === 'on_select_token') {
          onSelect(msg.token);
        } else {
          onClose();
        }
      }}
    />
  </div>
);
