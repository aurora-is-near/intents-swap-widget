import {
  AURORA_BASE64_LOGO,
  CHAIN_ICONS,
} from '@aurora-is-near/intents-swap-widget';
import type { Chains } from '@aurora-is-near/intents-swap-widget';

import type { Account } from '../../accounts/types';
import { Icon } from '../../components/Icon';
import { useNavigation } from '../../navigation';
import { shortAddress } from '../../utils';

const EMPTY_STATE_CHAINS: Chains[] = ['eth', 'sol', 'near', 'btc', 'ton'];

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
    className="flex items-center gap-sw-sm rounded-full bg-sw-gray-900 px-sw-md py-sw-sm text-sw-gray-50 hover:bg-sw-gray-800">
    <span className="block h-[20px] w-[20px] rounded-full bg-sw-accent-300" />
    <span className="text-sw-label-md text-sw-gray-50">{account.name}</span>
    {/* A passkey's intents ID looks like an EVM address: don't show it here. */}
    <span className="text-sw-label-sm text-sw-gray-300">
      {account.kind === 'passkey' ? 'Passkey' : shortAddress(account.address)}
    </span>
    <span className="text-sw-gray-300">
      <Icon name="chevronDown" size={16} />
    </span>
  </button>
);

export const HomeScreen = ({ account }: { account: Account }) => {
  const { push } = useNavigation();
  const openSettings = () => push({ name: 'settings' });

  return (
    <div className="sw flex h-screen flex-col bg-sw-gray-950 text-sw-gray-50">
      <header className="flex h-[56px] shrink-0 items-center gap-sw-md pl-sw-xl pr-sw-md">
        <img
          src={AURORA_BASE64_LOGO}
          alt="Aurora Intents"
          width={28}
          height={28}
          className="block h-[28px] w-[28px] shrink-0 rounded-sw-md"
        />
        <AccountPill account={account} onClick={openSettings} />
        <div className="grow" />
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
        <div className="flex flex-col gap-sw-md rounded-sw-lg bg-sw-gray-900 p-sw-2xl">
          <div className="flex flex-col items-center gap-sw-md py-sw-lg text-center">
            <div className="flex">
              {EMPTY_STATE_CHAINS.map((chain, index) => (
                <span
                  key={chain}
                  className="block h-[32px] w-[32px] overflow-hidden rounded-full shadow-[0_0_0_2px_var(--c-sw-gray-900)] [&>svg]:h-full [&>svg]:w-full"
                  style={{ marginLeft: index === 0 ? 0 : -6 }}>
                  {CHAIN_ICONS[chain]}
                </span>
              ))}
            </div>
            <span className="mt-sw-md text-sw-label-md text-sw-gray-50">
              Add funds to get started
            </span>
            <p className="m-0 max-w-[280px] text-sw-body-md text-sw-gray-300">
              Send crypto from any of 35+ chains to your deposit addresses.
            </p>
          </div>
          <span className="flex items-center justify-center gap-sw-sm text-sw-label-sm text-sw-gray-400">
            <Icon name="deposit" size={14} />
            Deposit addresses are coming next
          </span>
        </div>
      </main>
    </div>
  );
};
