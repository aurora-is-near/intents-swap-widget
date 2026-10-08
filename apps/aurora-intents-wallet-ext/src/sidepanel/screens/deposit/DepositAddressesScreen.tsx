import { Banner, CHAIN_ICONS, Hr } from '@aurora-is-near/intents-swap-widget';
import { CHAINS_LIST } from '@aurora-is-near/intents-swap-widget/constants';

import type { Account } from '../../accounts/types';
import { Icon, Spinner } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { EVM_NETWORK, OTHER_NETWORKS } from '../../deposit/networks';
import type { DepositNetwork } from '../../deposit/networks';
import { useDepositAddress } from '../../deposit/useDepositAddress';
import { useNavigation } from '../../navigation';
import { shortAddress } from '../../utils';

const VISIBLE_EVM_CHAINS = 5;

const evmChainsLabel = () => {
  const names = EVM_NETWORK.chains.map((chain) => CHAINS_LIST[chain].label);
  const hidden = names.length - VISIBLE_EVM_CHAINS;

  return `${names.slice(0, VISIBLE_EVM_CHAINS).join(', ')}${hidden > 0 ? ` +${hidden}` : ''}`;
};

const NetworkRow = ({
  account,
  network,
  enabled,
}: {
  account: Account;
  network: DepositNetwork;
  /** Waits for the EVM address: the first lookup creates the account. */
  enabled: boolean;
}) => {
  const { push } = useNavigation();
  const { data, isError } = useDepositAddress(account, network, { enabled });
  const isEvm = network.id === 'evm';
  const icon = network.id === 'evm' ? 'eth' : network.id;

  let detail: string;

  if (data) {
    detail = isEvm
      ? `${shortAddress(data.address)} · ${evmChainsLabel()}`
      : shortAddress(data.address);
  } else if (isError) {
    detail = 'Couldn’t load — tap to retry';
  } else {
    detail = enabled ? 'Generating address…' : 'Waiting…';
  }

  return (
    <li className="list-none">
      <button
        type="button"
        onClick={() => push({ name: 'depositDetail', network: network.id })}
        className="flex w-full items-center gap-sw-lg rounded-sw-md p-sw-lg text-left text-sw-gray-50 hover:bg-sw-gray-900">
        <span className="relative h-[28px] w-[28px] shrink-0">
          <span className="block h-[28px] w-[28px] overflow-hidden rounded-full [&>svg]:h-full [&>svg]:w-full">
            {CHAIN_ICONS[icon]}
          </span>
          {isEvm ? (
            <span className="absolute -bottom-[4px] -right-[4px] block h-[16px] w-[16px] overflow-hidden rounded-[6px] bg-sw-gray-950 p-[2px] [&>svg]:h-full [&>svg]:w-full">
              {CHAIN_ICONS.base}
            </span>
          ) : null}
        </span>
        <span className="flex min-w-[0px] grow flex-col gap-sw-xs">
          <span className="text-sw-label-md text-sw-gray-50">
            {network.title}
          </span>
          <span className="truncate text-sw-label-sm text-sw-gray-300">
            {detail}
          </span>
        </span>
        <span className="text-sw-gray-300">
          {!data && !isError && enabled ? (
            <Spinner size={16} />
          ) : (
            <Icon name="chevronRight" size={18} />
          )}
        </span>
      </button>
    </li>
  );
};

export const DepositAddressesScreen = ({ account }: { account: Account }) => {
  const { back } = useNavigation();
  const evm = useDepositAddress(account, EVM_NETWORK);

  return (
    <Screen title="Deposit" onBack={back}>
      <p className="m-0 text-sw-body-md text-sw-gray-200">
        Send crypto to one of your addresses. Whatever you send is converted to
        USDC and credited to your account.
      </p>
      {evm.isError ? (
        <Banner
          variant="error"
          message={`Couldn’t get your deposit addresses: ${evm.error.message}`}
          hasBg
          multiline
        />
      ) : null}
      <div className="flex flex-col gap-sw-sm">
        <span className="px-sw-xs text-sw-label-sm text-sw-gray-100">
          EVM networks — one address for all
        </span>
        <ul className="-mx-[12px] m-0 p-0">
          <NetworkRow account={account} network={EVM_NETWORK} enabled />
        </ul>
      </div>
      <Hr />
      <div className="flex flex-col gap-sw-sm">
        <span className="px-sw-xs text-sw-label-sm text-sw-gray-100">
          Other networks — {OTHER_NETWORKS.length}
        </span>
        <ul className="-mx-[12px] m-0 p-0">
          {OTHER_NETWORKS.map((network) => (
            <NetworkRow
              key={network.id}
              account={account}
              network={network}
              enabled={evm.isSuccess}
            />
          ))}
        </ul>
      </div>
    </Screen>
  );
};
