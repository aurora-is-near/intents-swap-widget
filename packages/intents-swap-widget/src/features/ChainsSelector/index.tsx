import { ChainsDropdown } from '../ChainsDropdown';

import { CHAIN_ICONS } from '@/icons';
import { ChainShortcut } from '@/components/ChainShortcut';

import { cn } from '@/utils/cn';
import { useChains } from '@/hooks';
import { useConfig } from '@/config';
import { notReachable } from '@/utils/notReachable';
import type { Chains, ChainsFilter } from '@/types/chain';

type SelectedChain = 'all' | 'intents' | Chains;

type Msg = { type: 'on_select_chain'; chain: SelectedChain };

type Props = {
  variant: 'source' | 'target';
  chainsFilter: ChainsFilter;
  selectedChain: SelectedChain;
  className?: string;
  onMsg: (msg: Msg) => void;
};

export const ChainsSelector = ({
  variant,
  chainsFilter,
  selectedChain,
  className,
  onMsg,
}: Props) => {
  const chains = useChains(variant);
  const {
    appIcon,
    appName,
    topChainShortcuts,
    intentsAccountType,
    showIntentTokens,
  } = useConfig();

  const topChains = topChainShortcuts?.(intentsAccountType) ?? [
    'eth',
    'btc',
    'sol',
    'near',
  ];

  return (
    <div
      className={cn('flex items-center justify-between gap-sw-md', className)}>
      <ChainShortcut.All
        isSelected={selectedChain === 'all'}
        onClick={() => onMsg({ type: 'on_select_chain', chain: 'all' })}
      />

      <ul className="flex items-center gap-sw-md">
        {showIntentTokens && (
          <ChainShortcut
            icon={appIcon}
            label={appName}
            isSelected={selectedChain === 'intents'}
            onClick={() => onMsg({ type: 'on_select_chain', chain: 'intents' })}
          />
        )}

        {topChains.map(
          (chain) =>
            // check it here to respect global chain filters
            chain in chains && (
              <ChainShortcut
                icon={CHAIN_ICONS[chain]}
                isSelected={selectedChain === chain}
                label={chains.find((c) => c.id === chain)?.label ?? ''}
                onClick={() => onMsg({ type: 'on_select_chain', chain })}
              />
            ),
        )}
      </ul>

      <ChainsDropdown
        variant={variant}
        selected={selectedChain}
        chainsFilter={chainsFilter}
        onMsg={(msg) => {
          switch (msg.type) {
            case 'on_click_chain':
              onMsg({ type: 'on_select_chain', chain: msg.chain });
              break;
            default:
              notReachable(msg.type, { throwError: false });
          }
        }}
      />
    </div>
  );
};
