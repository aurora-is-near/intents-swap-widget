import { Card } from '@/components/Card';
import { TokenIcon } from '@/components/TokenIcon';
import { formatUsdAmount } from '@/utils/formatters/formatUsdAmount';
import type { Token } from '@/types/token';

type Props = {
  token: Token;
  amount: string;
  amountUsd: number | bigint;
};

export const TokenRow = ({ token, amount, amountUsd }: Props) => (
  <Card className="flex items-center justify-between gap-sw-md pl-sw-2xl py-sw-lg">
    <div className="mt-auto">
      <TokenIcon
        token={token}
        chainShowIcon={!token.isIntent}
        className="border-sw-gray-900"
      />
    </div>
    <div className="text-sw-label-md text-sw-gray-50 mr-auto">
      {`${amount} ${token.symbol}`}
    </div>
    <span className="text-sw-label-sm text-sw-gray-200">
      {formatUsdAmount(amountUsd)}
    </span>
  </Card>
);
