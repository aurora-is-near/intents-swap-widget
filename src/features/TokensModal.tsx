import { useState } from 'react';
import * as Icons from 'lucide-react';

import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Banner } from '@/components/Banner';

import { cn } from '@/utils/cn';
import { useConfig } from '@/config';
import { useUnsafeSnapshot } from '@/machine/snap';
import { notReachable } from '@/utils/notReachable';
import type { Chains, DefaultChainsFilter } from '@/types/chain';
import type { Token } from '@/types/token';

import { TokensList } from './TokensList';
import { ChainsDropdown } from './ChainsDropdown';

type Msg =
  | { type: 'on_select_token'; token: Token }
  | { type: 'on_dismiss_tokens_modal' };

type Props = {
  groupTokens: boolean;
  showBalances: boolean;
  showChainsSelector: boolean;
  chainsFilter: DefaultChainsFilter;
  className?: string;
  onMsg: (msg: Msg) => void;
};

export const TokensModal = ({
  showBalances,
  showChainsSelector,
  chainsFilter,
  groupTokens,
  className,
  onMsg,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { walletSupportedChains } = useConfig();

  const [search, setSearch] = useState('');
  const [selectedChain, setSelectedChain] = useState<
    'all' | 'intents' | Chains
  >('all');

  const selectedChainIsNotSupportedByConnectedWallet =
    selectedChain !== 'all' &&
    selectedChain !== 'intents' &&
    !walletSupportedChains.includes(selectedChain);

  return (
    <Card className={cn('gap-sw-2xl flex flex-col pb-0', className)}>
      <header className="py-sw-md flex items-center justify-between">
        <h2 className="text-sw-label-l">Select token</h2>
        <button
          type="button"
          className="flex cursor-pointer items-center justify-center text-sw-gray-100 transition-colors hover:text-sw-gray-50"
          onClick={() => onMsg({ type: 'on_dismiss_tokens_modal' })}>
          <Icons.X size={22} />
        </button>
      </header>

      <div className="gap-sw-xl flex items-center">
        <Input
          icon={Icons.Search}
          defaultValue={search}
          className="w-full"
          placeholder="Search or paste address"
          onChange={(e) => setSearch(e.target.value.trim())}
        />
        {showChainsSelector && (
          <ChainsDropdown
            selected={selectedChain}
            chainsFilter={chainsFilter}
            onMsg={(msg) => {
              switch (msg.type) {
                case 'on_click_chain':
                  setSelectedChain(msg.chain);
                  break;
                default:
                  notReachable(msg.type, { throwError: false });
              }
            }}
          />
        )}
      </div>

      {selectedChainIsNotSupportedByConnectedWallet && !!ctx.walletAddress && (
        <Banner
          variant="info"
          message="Your connected wallet doesn't support this chain"
        />
      )}

      <TokensList
        search={search}
        groupTokens={groupTokens}
        showBalances={showBalances}
        chainsFilter={chainsFilter}
        selectedChain={selectedChain}
        onMsg={(msg) => {
          switch (msg.type) {
            case 'on_reset_search':
              setSearch('');
              break;
            case 'on_select_token':
              onMsg(msg);
              break;
            default:
              notReachable(msg, { throwError: false });
          }
        }}
      />
    </Card>
  );
};
