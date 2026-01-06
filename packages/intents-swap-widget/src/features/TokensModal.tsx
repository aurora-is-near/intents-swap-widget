import { Search } from '@material-symbols-svg/react-rounded/w700';
import { useRef, useState } from 'react';

import { TokensList } from './TokensList';
import { ChainsDropdown } from './ChainsDropdown';
import { useChains } from '../hooks';
import { Hr } from '@/components/Hr';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Banner } from '@/components/Banner';
import { CloseButton } from '@/components/CloseButton';

import { cn } from '@/utils/cn';
import { useConfig } from '@/config';
import { useHandleKeyDown } from '@/hooks';
import { useUnsafeSnapshot } from '@/machine/snap';
import { notReachable } from '@/utils/notReachable';
import { useTypedTranslation } from '@/localisation';
import type { Chains, ChainsFilter } from '@/types/chain';
import type { Token } from '@/types/token';

type Msg =
  | { type: 'on_select_token'; token: Token }
  | { type: 'on_dismiss_tokens_modal' };

type Props = {
  variant: 'source' | 'target';
  groupTokens: boolean;
  showBalances: boolean;
  showChainsSelector: boolean;
  chainsFilter: ChainsFilter;
  className?: string;
  onMsg: (msg: Msg) => void;
};

export const TokensModal = ({
  variant,
  showBalances,
  showChainsSelector,
  chainsFilter,
  groupTokens,
  className,
  onMsg,
}: Props) => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();
  const { walletSupportedChains } = useConfig();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const chains = useChains(variant);

  const handleClose = () => onMsg({ type: 'on_dismiss_tokens_modal' });

  useHandleKeyDown(
    'Escape',
    () => {
      if (search) {
        setSearch('');
      } else {
        handleClose();
      }
    },
    [search],
  );

  useHandleKeyDown('Alphanumeric', (key) => {
    setSearch((s) => s + key);
    searchInputRef.current?.focus();
  });

  // If there is only one chain available, select it by default
  const defaultChain =
    chains.length === 1 && chains[0]?.id ? chains[0]?.id : 'all';

  const [selectedChain, setSelectedChain] = useState<
    'all' | 'intents' | Chains
  >(defaultChain);

  // selected chain is not supported by connected wallet
  const chainIsNotSupported =
    selectedChain !== 'all' &&
    selectedChain !== 'intents' &&
    chainsFilter.external !== 'all' &&
    !walletSupportedChains.includes(selectedChain);

  return (
    <Card
      padding="none"
      className={cn(
        'w-full gap-sw-xl flex flex-col px-sw-2xl pt-sw-2xl',
        className,
      )}>
      <header className="flex items-center justify-between">
        <h2 className="text-sw-label-lg text-sw-gray-50">Select token</h2>
        <CloseButton onClick={handleClose} />
      </header>

      <div className="gap-sw-xl flex items-center">
        <Input
          focusOnMount
          icon={Search}
          ref={searchInputRef}
          defaultValue={search}
          className="w-full"
          placeholder="Search or paste address"
          onChange={(e) => setSearch(e.target.value.trim())}
        />
        {showChainsSelector && (
          <ChainsDropdown
            variant={variant}
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

      {chainIsNotSupported && !!ctx.walletAddress && (
        <>
          <Banner
            variant="error"
            message={t(
              'wallet.connected.error.notSupportedChain',
              'This network isn’t supported by your wallet.',
            )}
          />
          <Hr />
        </>
      )}

      <TokensList
        variant={variant}
        search={search}
        groupTokens={groupTokens}
        showBalances={showBalances}
        chainsFilter={chainsFilter}
        selectedChain={selectedChain}
        chainIsNotSupported={chainIsNotSupported}
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
