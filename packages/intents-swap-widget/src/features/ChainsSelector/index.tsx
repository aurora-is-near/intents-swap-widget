import { ChainsDropdown } from '../ChainsDropdown';

import { CHAIN_ICONS } from '@/icons';
import { ChainShortcut } from '@/components/ChainShortcut';

import { cn } from '@/utils/cn';
import { useChains, useIntentsAccountType } from '@/hooks';
import { useConfig } from '@/config';
import { noop } from '@/utils/noop';
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
  const { intentsAccountType } = useIntentsAccountType();
  const { appIcon, appName, topChainShortcuts, enableAccountAbstraction } =
    useConfig();

  const topChains =
    topChainShortcuts?.(intentsAccountType) ??
    (['eth', 'btc', 'sol', 'near'] as const);

  return (
    <div
      className={cn('flex items-start justify-between gap-sw-md', className)}>
      <ChainShortcut.All
        isSelected={selectedChain === 'all'}
        onClick={() => onMsg({ type: 'on_select_chain', chain: 'all' })}
      />

      <ul className="flex items-center gap-sw-md mr-auto flex-wrap h-[36px] overflow-hidden">
        {enableAccountAbstraction && (
          <ChainShortcut
            icon={appIcon}
            label={appName}
            isSelected={selectedChain === 'intents'}
            onClick={() => onMsg({ type: 'on_select_chain', chain: 'intents' })}
          />
        )}

        {topChains.map((chain, index) => {
          // last shortcut reserved for the selected chain
          if (
            index === topChains.length - 1 &&
            ![...topChains, 'all', 'intents'].includes(selectedChain)
          ) {
            return (
              <ChainShortcut
                isSelected
                key={selectedChain}
                icon={CHAIN_ICONS[selectedChain as Chains]}
                label={chains.find((c) => c.id === selectedChain)?.label ?? ''}
                onClick={noop}
              />
            );
          }

          // check it here to respect global chain filters
          if (chains.some((c) => c.id === chain)) {
            return (
              <ChainShortcut
                key={chain}
                icon={CHAIN_ICONS[chain]}
                isSelected={selectedChain === chain}
                label={chains.find((c) => c.id === chain)?.label ?? ''}
                onClick={() => onMsg({ type: 'on_select_chain', chain })}
              />
            );
          }

          return null;
        })}
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
