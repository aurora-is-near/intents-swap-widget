import { CHAINS, TokenIcon } from '@aurora-is-near/intents-swap-widget';
import type { Token } from '@aurora-is-near/intents-swap-widget';

/** The token with its network's badge, for account and wallet tokens alike. */
export const TokenWithChain = ({ token }: { token: Token }) => (
  <span className="relative flex shrink-0">
    <TokenIcon token={token} size="lg" hideChainIcon />
    <span className="absolute -bottom-[2px] -right-[4px] flex h-[18px] w-[18px] overflow-hidden rounded-[5px] border-2 border-sw-gray-900">
      {CHAINS.find((chain) => chain.id === token.blockchain)?.icon ?? null}
    </span>
  </span>
);
