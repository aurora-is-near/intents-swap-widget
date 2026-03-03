import { TinyNumber, TokenIcon } from '../../components';
import { Token } from '../../types';
import { formatUsdAmount } from '../../utils';

type TokenAmountRowProps = {
  token: Token;
  amount: string;
  usdAmount?: string | null;
};

export const TransactionDetailsToken = ({
  token,
  amount,
  usdAmount,
}: TokenAmountRowProps) => {
  const usd = usdAmount ? parseFloat(usdAmount) : null;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-x-sw-lg">
        <TokenIcon token={token} size="lg" />
        <span className="text-sw-h5 text-sw-gray-50">
          <TinyNumber value={amount} /> {token.symbol}
        </span>
      </div>

      {!!usd && (
        <span className="text-sw-label-md text-sw-gray-400">
          {formatUsdAmount(usd)}
        </span>
      )}
    </div>
  );
};
