import { TokenIcon } from '@aurora-is-near/intents-swap-widget';
import { formatBigToHuman } from '@aurora-is-near/intents-swap-widget/utils';
import type { Token } from '@aurora-is-near/intents-swap-widget/types';

type Props = {
  token: Token;
  amount: string;
};

export const TokenAmount = ({ token, amount }: Props) => {
  return (
    <div className="flex flex-row items-center">
      <TokenIcon
        chainShowIcon
        icon={token.icon}
        name={token.name}
        chainIcon={token.chainIcon}
        chainName={token.blockchain}
      />

      <span className="text-sw-label-m ml-sw-[10px] font-medium text-sw-gray-50">
        {formatBigToHuman(amount, token.decimals)} {token.symbol}
      </span>
    </div>
  );
};
