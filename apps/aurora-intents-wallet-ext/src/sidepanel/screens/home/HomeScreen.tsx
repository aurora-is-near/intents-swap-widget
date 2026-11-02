import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Button,
  CHAIN_ICONS,
  TokensList,
} from '@aurora-is-near/intents-swap-widget';
import type { Chains } from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import type { Account } from '../../accounts/types';
import { useAccounts } from '../../accounts/useAccounts';
import { sourceKey, useTransferSource } from '../../accounts/useTransferSource';
import { Icon } from '../../components/Icon';
import { EVM_NETWORK, OTHER_NETWORKS } from '../../deposit/networks';
import { useDepositAddress } from '../../deposit/useDepositAddress';
import { ActionButton } from '../../components/ActionButton';
import { Tabs } from '../../components/Tabs';
import { SiteConnectionBar } from '../../components/SiteConnectionBar';
import { useAccountAssets } from '../../home/useAccountAssets';
import { useSiteConnection } from '../../home/useSiteConnection';
import type { Asset } from '../../home/useAccountAssets';
import { useNavigation } from '../../navigation';
import { shortAddress } from '../../utils';
import { sourceOptions } from '../transfer/walletOptions';
import { WalletPicker } from '../transfer/WalletPicker';
import { WalletSelector } from '../transfer/WalletSelector';

const EMPTY_STATE_CHAINS: Chains[] = ['eth', 'sol', 'near', 'btc', 'ton'];
const DEPOSIT_CARD_CHAINS: Chains[] = ['eth', 'sol', 'near', 'btc'];

const ChainIcon = ({
  chain,
  size,
  index,
}: {
  chain: Chains;
  size: number;
  index: number;
}) => (
  <span
    className="block overflow-hidden rounded-full shadow-[0_0_0_2px_var(--c-sw-gray-900)] [&>svg]:h-full [&>svg]:w-full"
    style={{ width: size, height: size, marginLeft: index === 0 ? 0 : -6 }}>
    {CHAIN_ICONS[chain]}
  </span>
);

const AccountPill = ({
  account,
  onClick,
}: {
  account: Account;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-w-[0px] items-center gap-sw-sm rounded-full bg-sw-gray-900 px-sw-md py-sw-sm text-sw-gray-50 hover:bg-sw-gray-800">
    <span className="block h-[20px] w-[20px] shrink-0 rounded-full bg-sw-accent-300" />
    <span className="truncate text-sw-label-md text-sw-gray-50">
      {account.name}
    </span>
    {/* A passkey's intents ID looks like an EVM address: don't show it here. */}
    <span className="shrink-0 text-sw-label-sm text-sw-gray-300">
      {account.kind === 'passkey' ? 'Passkey' : shortAddress(account.address)}
    </span>
    <span className="text-sw-gray-300">
      <Icon name="chevronDown" size={16} />
    </span>
  </button>
);

const DepositCard = ({
  account,
  onClick,
}: {
  account: Account;
  onClick: () => void;
}) => {
  const { data } = useDepositAddress(account, EVM_NETWORK);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-sw-lg rounded-sw-lg bg-sw-gray-900 px-sw-xl py-sw-lg text-left text-sw-gray-50 hover:bg-sw-gray-800">
      <span className="flex grow flex-col gap-sw-xs">
        <span className="text-sw-label-md text-sw-gray-50">
          Receive from different chains
        </span>
        <span className="flex items-center gap-sw-sm">
          {data ? (
            <span className="text-sw-label-sm text-sw-gray-300">
              {shortAddress(data.address)}
            </span>
          ) : null}
          <span className="text-sw-label-sm text-sw-gray-400">
            {data ? '· ' : 'EVM '}+{OTHER_NETWORKS.length} networks
          </span>
        </span>
      </span>
      <span className="flex">
        {DEPOSIT_CARD_CHAINS.map((chain, index) => (
          <ChainIcon key={chain} chain={chain} size={20} index={index} />
        ))}
      </span>
      <span className="text-sw-gray-300">
        <Icon name="chevronRight" size={18} />
      </span>
    </button>
  );
};

type AssetTab = 'account' | 'wallet';

const assetTabs = (hasSecondaries: boolean) =>
  [
    ['account', 'Account'],
    ['wallet', hasSecondaries ? 'Wallets' : 'Connected wallet'],
  ] as const;

/**
 * Which of the account's wallets the Wallets tab shows (and Swap and Send
 * spend from): a pill with a picker, when there is more than one.
 */
const WalletChip = ({ account }: { account: Account }) => {
  const { secondaries } = useAccounts();
  const { source, wallet, select } = useTransferSource();
  const [isPicking, setIsPicking] = useState(false);

  if (!wallet) {
    return null;
  }

  // On-chain wallets only: a passkey's balance is on the Account tab.
  const options = sourceOptions(account, secondaries).filter(
    (option) => option.source.kind === 'secondary' || account.kind === 'wallet',
  );

  const selectedId = sourceKey(source);

  const current = options.find((option) => option.id === selectedId);

  return (
    <>
      {current ? (
        <WalletSelector
          ariaLabel="Wallet"
          option={current}
          onClick={() => setIsPicking(true)}
        />
      ) : null}
      {isPicking ? (
        <WalletPicker
          title="Wallet"
          description="Whose tokens to show here, and to spend on Swap and Send."
          options={options}
          selectedId={selectedId}
          onSelect={(option) => {
            select(option.source);
            setIsPicking(false);
          }}
          onClose={() => setIsPicking(false)}
        />
      ) : null}
    </>
  );
};

const AssetSection = ({
  assets,
  emptyMessage,
  onRefresh,
  onOpen,
  isRefreshing,
}: {
  assets: Asset[];
  /** Shown instead of the list: a line, or the account's "add funds" card. */
  emptyMessage: React.ReactNode;
  onRefresh: () => void;
  onOpen: (token: Asset['token']) => void;
  isRefreshing?: boolean;
}) => (
  <section className="flex flex-col gap-sw-sm">
    <div className="flex items-center justify-between px-sw-xs">
      <span className="text-sw-label-sm text-sw-gray-100">
        Assets — {assets.length}
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-sw-xs text-sw-label-sm text-sw-gray-300 hover:text-sw-gray-50 disabled:opacity-60">
        <span className={cn(isRefreshing && 'animate-spin')}>
          <Icon name="refresh" size={13} />
        </span>
        Refresh
      </button>
    </div>
    {assets.length > 0 ? (
      <ul className="-mx-[12px] m-0 flex flex-col p-0">
        {assets.map(({ token, balance }) => (
          <TokensList.Item
            key={`${token.assetId}-${token.blockchain}-${String(token.isIntent)}`}
            token={token}
            balance={balance}
            variant="source"
            onMsg={(msg) => onOpen(msg.token)}
          />
        ))}
      </ul>
    ) : (
      emptyMessage
    )}
  </section>
);

const Skeleton = ({ className }: { className: string }) => (
  <div
    className={cn('animate-pulse rounded-sw-md bg-sw-gray-800', className)}
  />
);

const HomeSkeleton = () => (
  <div
    className="flex flex-col gap-sw-2xl"
    aria-busy="true"
    aria-label="Loading balances">
    <div className="flex flex-col items-center gap-sw-sm pb-sw-md pt-sw-xl">
      <Skeleton className="h-[14px] w-[88px]" />
      <Skeleton className="h-[36px] w-[160px]" />
      <Skeleton className="h-[14px] w-[104px]" />
    </div>
    <Skeleton className="h-[72px] w-full rounded-sw-lg" />
    <div className="flex flex-col gap-sw-lg">
      {['a', 'b', 'c', 'd'].map((row) => (
        <div key={row} className="flex items-center gap-sw-lg">
          <Skeleton className="h-[40px] w-[40px] rounded-full" />
          <div className="flex grow flex-col gap-sw-sm">
            <Skeleton className="h-[14px] w-[120px]" />
            <Skeleton className="h-[12px] w-[72px]" />
          </div>
          <Skeleton className="h-[14px] w-[56px]" />
        </div>
      ))}
    </div>
  </div>
);

const EmptyCard = ({ onDeposit }: { onDeposit: () => void }) => (
  <div className="flex flex-col gap-sw-md rounded-sw-lg bg-sw-gray-900 p-sw-2xl">
    <div className="flex flex-col items-center gap-sw-md py-sw-lg text-center">
      <div className="flex">
        {EMPTY_STATE_CHAINS.map((chain, index) => (
          <ChainIcon key={chain} chain={chain} size={32} index={index} />
        ))}
      </div>
      <span className="mt-sw-md text-sw-label-md text-sw-gray-50">
        Add funds to get started
      </span>
      <p className="m-0 max-w-[280px] text-sw-body-md text-sw-gray-300">
        Send crypto from any of 35+ chains to your deposit addresses. It arrives
        in your account as USDC.
      </p>
    </div>
    <Button variant="primary" size="md" onClick={onDeposit}>
      Receive funds
    </Button>
  </div>
);

export const HomeScreen = ({ account }: { account: Account }) => {
  const { push } = useNavigation();
  const { secondaries } = useAccounts();
  const { wallet, select } = useTransferSource();
  const queryClient = useQueryClient();
  const assets = useAccountAssets();
  const siteConnection = useSiteConnection(account);
  const [chosenTab, setChosenTab] = useState<AssetTab | null>(null);
  // Wallets to show: the account's own, or secondary ones.
  const hasWallets = account.kind === 'wallet' || secondaries.length > 0;
  // Account first; the wallet when only it holds anything (until chosen).
  const tab: AssetTab = !hasWallets
    ? 'account'
    : (chosenTab ??
      (assets.account.length === 0 && assets.wallet.length > 0
        ? 'wallet'
        : 'account'));

  // A passkey account's Wallets tab shows a secondary wallet: the first one
  // until picked.
  useEffect(() => {
    const first = secondaries[0];

    if (tab === 'wallet' && !wallet && first) {
      select({ kind: 'secondary', id: first.id });
    }
  }, [tab, wallet, secondaries]);

  const openSettings = () => push({ name: 'settings' });
  const openDeposit = () => push({ name: 'deposit' });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['intentsBalances'] });
    void queryClient.invalidateQueries({ queryKey: ['walletTokensBalance'] });
  };

  return (
    <div className="sw flex h-screen flex-col bg-sw-gray-950 text-sw-gray-50">
      <header className="flex h-[56px] shrink-0 items-center gap-sw-md pl-sw-xl pr-sw-md">
        <AccountPill account={account} onClick={openSettings} />
        <div className="grow" />
        <button
          type="button"
          aria-label="Activity"
          title="Activity"
          onClick={() => push({ name: 'activity' })}
          className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sw-md text-sw-gray-200 hover:bg-sw-gray-900">
          <Icon name="activity" />
        </button>
        <button
          type="button"
          aria-label="Settings"
          title="Settings"
          onClick={openSettings}
          className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sw-md text-sw-gray-200 hover:bg-sw-gray-900">
          <Icon name="settings" />
        </button>
      </header>
      <main className="flex min-h-[0px] grow flex-col gap-sw-2xl overflow-y-auto px-sw-xl pb-sw-xl pt-sw-md">
        {assets.isLoading ? (
          <HomeSkeleton />
        ) : (
          <>
            <section className="flex flex-col items-center gap-sw-sm pb-sw-md pt-sw-xl">
              <span className="text-sw-label-sm text-sw-gray-300">
                Total balance
              </span>
              <p className="m-0 text-sw-value-lg text-sw-gray-50">
                {assets.totalUsd}
              </p>
              {assets.networks > 0 ? (
                <span className="text-sw-label-sm text-sw-gray-400">
                  Across {assets.networks}{' '}
                  {assets.networks === 1 ? 'network' : 'networks'}
                </span>
              ) : null}
            </section>
            <nav aria-label="Actions" className="flex gap-sw-md">
              <ActionButton
                icon="swap"
                label="Swap"
                onClick={() => push({ name: 'swap' })}
              />
              <ActionButton
                icon="deposit"
                label="Receive"
                onClick={openDeposit}
              />
              <ActionButton
                icon="send"
                label="Send"
                onClick={() => push({ name: 'send' })}
              />
              <ActionButton
                icon="apps"
                label="Apps"
                tone="light"
                onClick={() => push({ name: 'apps' })}
              />
            </nav>
            {assets.isEmpty ? (
              <EmptyCard onDeposit={openDeposit} />
            ) : (
              <>
                <DepositCard account={account} onClick={openDeposit} />
                {hasWallets ? (
                  <Tabs
                    label="Assets"
                    tabs={assetTabs(secondaries.length > 0)}
                    value={tab}
                    onChange={setChosenTab}
                  />
                ) : null}
                {tab === 'wallet' && secondaries.length > 0 ? (
                  <WalletChip account={account} />
                ) : null}
                <AssetSection
                  assets={tab === 'account' ? assets.account : assets.wallet}
                  emptyMessage={
                    tab === 'account' ? (
                      <EmptyCard onDeposit={openDeposit} />
                    ) : (
                      <p className="m-0 px-sw-xs py-sw-lg text-sw-body-md text-sw-gray-300">
                        No tokens found in {wallet?.name ?? 'your wallet'}.
                      </p>
                    )
                  }
                  onRefresh={refresh}
                  isRefreshing={assets.isRefreshing}
                  onOpen={(token) => push({ name: 'asset', token })}
                />
              </>
            )}
          </>
        )}
      </main>
      {account.kind === 'wallet' && siteConnection ? (
        <SiteConnectionBar account={account} connection={siteConnection} />
      ) : null}
    </div>
  );
};
