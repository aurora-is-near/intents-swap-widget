import { Button, CHAIN_ICONS } from '@aurora-is-near/intents-swap-widget';
import type { Chains } from '@aurora-is-near/intents-swap-widget';

import type { Account, WalletAccount } from '../../accounts/types';
import { useAccounts } from '../../accounts/useAccounts';
import { unsupportedReason } from '../../apps/connectors';
import { PUSD_DECIMALS } from '../../apps/polymarket/constants';
import { usePolymarketAccount } from '../../apps/polymarket/usePolymarketAccount';
import { usePolymarketBalance } from '../../apps/polymarket/usePolymarketBalance';
import { INTEGRATIONS } from '../../apps/registry';
import { AppMark } from '../../components/AppMark';
import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';
import { formatAmount, shortAddress } from '../../utils';
import { chainLabel } from '../transfer/summary';

const POLYMARKET = INTEGRATIONS[0]!;

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="flex items-center gap-sw-xs rounded-full bg-sw-gray-800 px-sw-md py-sw-xs text-sw-label-sm text-sw-gray-100">
    {children}
  </span>
);

/** Polymarket in the list: where it lands, and the account it tops up. */
const PolymarketCard = ({
  account,
  onOpen,
}: {
  account: WalletAccount;
  onOpen: () => void;
}) => {
  const pmAccount = usePolymarketAccount(account);
  const balance = usePolymarketBalance(pmAccount.address, 'idle');

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full shrink-0 flex-col gap-sw-lg rounded-sw-lg bg-sw-gray-900 p-sw-xl text-left hover:bg-sw-gray-800">
      <span className="flex items-center gap-sw-lg">
        <AppMark app={POLYMARKET} />
        <span className="flex min-w-[0px] grow flex-col gap-sw-xs">
          <span className="text-sw-label-lg text-sw-gray-50">
            {POLYMARKET.name}
          </span>
          <span className="text-sw-label-sm text-sw-gray-300">
            {POLYMARKET.description}
          </span>
        </span>
        <span className="text-sw-gray-300">
          <Icon name="chevronRight" size={18} />
        </span>
      </span>
      <span className="flex flex-wrap gap-sw-sm">
        <Pill>
          <span className="block h-[16px] w-[16px] overflow-hidden rounded-full [&>svg]:h-full [&>svg]:w-full">
            {CHAIN_ICONS[POLYMARKET.chain]}
          </span>
          {chainLabel(POLYMARKET.chain)}
        </Pill>
        <Pill>Arrives as {POLYMARKET.arrivesAs}</Pill>
      </span>
      <span className="flex items-center gap-sw-sm border-t border-sw-gray-800 pt-sw-lg text-sw-label-sm text-sw-gray-200">
        {pmAccount.isValid ? (
          <>
            <span className="block h-[8px] w-[8px] shrink-0 rounded-full bg-sw-status-success" />
            Account {shortAddress(pmAccount.address)}
            {balance.data === undefined
              ? ''
              : ` · ${formatAmount(Number(balance.data) / 10 ** PUSD_DECIMALS)} pUSD`}
          </>
        ) : (
          <>
            <span className="block h-[8px] w-[8px] shrink-0 rounded-full bg-sw-gray-500" />
            {pmAccount.isLoading
              ? 'Looking for your Polymarket account…'
              : 'Add your Polymarket account'}
          </>
        )}
      </span>
    </button>
  );
};

/** Chains a deposit can start from, for the intro's icon row. */
const INTRO_CHAINS: Chains[] = ['eth', 'sol', 'near', 'btc'];

/** What Apps do, styled like the coming-soon card but more compact. */
const IntroCard = ({ accountName }: { accountName: string }) => (
  <div className="flex shrink-0 flex-col items-center gap-sw-sm rounded-sw-lg bg-sw-gray-900 px-sw-2xl py-sw-xl text-center">
    <div className="flex">
      {INTRO_CHAINS.map((chain, index) => (
        <span
          key={chain}
          className="block h-[24px] w-[24px] overflow-hidden rounded-full shadow-[0_0_0_2px_var(--c-sw-gray-900)] [&>svg]:h-full [&>svg]:w-full"
          style={{ marginLeft: index === 0 ? 0 : -5 }}>
          {CHAIN_ICONS[chain]}
        </span>
      ))}
    </div>
    <span className="mt-sw-xs text-sw-label-md text-sw-gray-50">
      Use your funds in apps
    </span>
    <p className="m-0 max-w-[300px] text-sw-body-sm text-sw-gray-300">
      Bridged, swapped and delivered for you — one approval in {accountName}, no
      gas or bridges to handle.
    </p>
  </div>
);

/** Kinds of apps on the way, as the card's icon row. */
const COMING_SOON_ICONS: IconName[] = ['swap', 'deposit', 'link', 'apps'];

/** Pinned to the bottom of Apps, styled like Home's "add funds" card. */
const ComingSoonCard = () => (
  <div className="mt-auto flex shrink-0 flex-col items-center gap-sw-md rounded-sw-lg bg-sw-gray-900 px-sw-2xl py-sw-3xl text-center">
    <div className="flex">
      {COMING_SOON_ICONS.map((icon, index) => (
        <span
          key={icon}
          className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-sw-gray-800 text-sw-gray-200 shadow-[0_0_0_2px_var(--c-sw-gray-900)]"
          style={{ marginLeft: index === 0 ? 0 : -6 }}>
          <Icon name={icon} size={16} />
        </span>
      ))}
    </div>
    <span className="mt-sw-md text-sw-label-md text-sw-gray-50">
      More apps coming soon
    </span>
    <p className="m-0 max-w-[280px] text-sw-body-md text-sw-gray-300">
      Vaults, lending and more, each funded from any chain with one approval.
      Built on Intents Connect.
    </p>
  </div>
);

const Placeholder = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="flex flex-col items-center gap-sw-xl px-sw-md pb-sw-3xl pt-sw-5xl text-center">
    <div className="flex h-[56px] w-[56px] items-center justify-center rounded-sw-lg bg-sw-gray-900 text-sw-gray-200">
      <Icon name="apps" size={28} />
    </div>
    <div className="flex flex-col items-center gap-sw-md">
      <h2 className="text-sw-h5 text-sw-gray-50">{title}</h2>
      <p className="max-w-[300px] text-sw-body-md text-sw-gray-200">
        {description}
      </p>
    </div>
  </div>
);

/**
 * App integrations, run through Intents Connect: Polymarket for now. It
 * doesn't support passkey accounts yet, so those are pointed to a wallet
 * account.
 */
export const AppsScreen = ({ account }: { account: Account }) => {
  const { back, push } = useNavigation();
  const { accounts } = useAccounts();
  const hasWalletAccount = accounts.some((item) => item.kind === 'wallet');

  if (account.kind === 'passkey') {
    return (
      <Screen
        title="Apps"
        onBack={back}
        footer={
          <>
            <Button
              variant="primary"
              size="lg"
              onClick={() => push({ name: 'connectWallet' })}>
              Connect a wallet
            </Button>
            {hasWalletAccount ? (
              <Button
                variant="outlined"
                size="lg"
                onClick={() => push({ name: 'settings' })}>
                Select connected wallet
              </Button>
            ) : null}
          </>
        }>
        <Placeholder
          title="Apps need a wallet account"
          description="App integrations aren’t supported for passkey accounts yet. Connect a wallet to use them."
        />
      </Screen>
    );
  }

  const unsupported = unsupportedReason(account);

  if (unsupported) {
    return (
      <Screen title="Apps" onBack={back}>
        <Placeholder
          title="Apps aren’t available here yet"
          description={unsupported}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Apps" onBack={back}>
      <IntroCard accountName={account.name} />
      <PolymarketCard
        account={account}
        onOpen={() => push({ name: 'polymarket' })}
      />
      <ComingSoonCard />
    </Screen>
  );
};
