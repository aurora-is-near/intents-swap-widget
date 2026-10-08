import { CHAINS, TokenIcon } from '@aurora-is-near/intents-swap-widget';
import type { Token } from '@aurora-is-near/intents-swap-widget';
import { formatUsdAmount } from '@aurora-is-near/intents-swap-widget/utils';

import { Icon } from '../../components/Icon';
import { chainLabel } from './summary';

type Leg = {
  token: Token;
  /** Formatted, e.g. `0.198`. */
  amount: string;
  usd: number | null;
};

/** The token with its network's badge, for account and wallet tokens alike. */
const TokenWithChain = ({ token }: { token: Token }) => (
  <span className="relative flex shrink-0">
    <TokenIcon token={token} size="lg" hideChainIcon />
    <span className="absolute -bottom-[2px] -right-[4px] flex h-[18px] w-[18px] overflow-hidden rounded-[5px] border-2 border-sw-gray-900">
      {CHAINS.find((chain) => chain.id === token.blockchain)?.icon ?? null}
    </span>
  </span>
);

const LegRow = ({ label, leg }: { label: string; leg: Leg }) => (
  <div className="flex items-center gap-sw-lg">
    <TokenWithChain token={leg.token} />
    <div className="flex min-w-[0px] grow flex-col gap-sw-xs">
      <span className="text-sw-label-sm text-sw-gray-300">{label}</span>
      <span className="truncate text-sw-label-lg text-sw-gray-50">
        {leg.amount} {leg.token.symbol}
      </span>
      <span className="text-sw-label-sm text-sw-gray-300">
        on {chainLabel(leg.token.blockchain)}
        {leg.token.isIntent ? ' · in your account' : ''}
      </span>
    </div>
    {leg.usd !== null ? (
      <span className="shrink-0 self-end text-sw-label-sm text-sw-gray-200">
        {formatUsdAmount(leg.usd)}
      </span>
    ) : null}
  </div>
);

type Props = {
  from?: { label: string; leg: Leg };
  to: { label: string; leg: Leg };
};

/** What went in and what came out, with icons, on result screens. */
export const TransferLegs = ({ from, to }: Props) => (
  <div className="flex shrink-0 flex-col gap-sw-md rounded-sw-lg bg-sw-gray-900 p-sw-xl">
    {from ? (
      <>
        <LegRow label={from.label} leg={from.leg} />
        <span className="flex w-[40px] justify-center text-sw-gray-400">
          <Icon name="arrowDown" size={16} />
        </span>
      </>
    ) : null}
    <LegRow label={to.label} leg={to.leg} />
  </div>
);
