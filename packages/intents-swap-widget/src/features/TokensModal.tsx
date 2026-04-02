import { useCallback, useEffect, useRef, useState } from 'react';
import { SearchW700 as Search } from '@material-symbols-svg/react-rounded/icons/search';

import { useChains } from '../hooks';
import { TokensList } from './TokensList';
import { ChainsSelector } from './ChainsSelector';

import { useSupportedChains } from '../hooks/useSupportedChains';
import { Hr } from '@/components/Hr';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Banner } from '@/components/Banner';
import { CloseButton } from '@/components/CloseButton';

import { cn } from '@/utils/cn';
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
  const { supportedChains } = useSupportedChains();

  const modalContentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [isModalFocused, setIsModalFocused] = useState(false);
  const chains = useChains(variant);

  const focusContainerIfNeeded = useCallback((target: HTMLElement | null) => {
    if (!target) {
      return;
    }

    const focusableTarget = target.closest(
      'input, textarea, select, button, a[href], [tabindex]:not([tabindex="-1"]), [contenteditable="true"]',
    );

    if (!focusableTarget) {
      modalContentRef.current?.focus({ preventScroll: true });
    }
  }, []);

  const handleClose = () => onMsg({ type: 'on_dismiss_tokens_modal' });

  useEffect(() => {
    const modalContent = modalContentRef.current;

    if (!modalContent) {
      return;
    }

    setIsModalFocused(modalContent.contains(document.activeElement));

    const handleFocusIn = () => setIsModalFocused(true);
    const handleFocusOut = (event: FocusEvent) => {
      const nextTarget = event.relatedTarget as Node | null;

      if (nextTarget && modalContent.contains(nextTarget)) {
        return;
      }

      setIsModalFocused(false);
    };

    modalContent.addEventListener('focusin', handleFocusIn);
    modalContent.addEventListener('focusout', handleFocusOut);

    return () => {
      modalContent.removeEventListener('focusin', handleFocusIn);
      modalContent.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

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
    { enabled: isModalFocused },
  );

  useHandleKeyDown(
    'Alphanumeric',
    (key) => {
      setSearch((s) => s + key);
      searchInputRef.current?.focus();
    },
    [],
    { enabled: isModalFocused },
  );

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
    !supportedChains.includes(selectedChain);

  return (
    <div
      tabIndex={-1}
      ref={modalContentRef}
      onMouseDownCapture={(event) => {
        focusContainerIfNeeded(event.target as HTMLElement | null);
      }}
      className="w-full outline-none">
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
          <ChainsSelector
            variant={variant}
            chainsFilter={chainsFilter}
            selectedChain={selectedChain}
            onMsg={(msg) => {
              switch (msg.type) {
                case 'on_select_chain':
                  setSelectedChain(msg.chain);
                  break;
                default:
                  notReachable(msg.type);
              }
            }}
          />
        )}

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
          keyboardNavigationEnabled={isModalFocused}
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
    </div>
  );
};
