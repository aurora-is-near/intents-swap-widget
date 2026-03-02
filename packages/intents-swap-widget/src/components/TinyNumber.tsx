import { formatUnits } from 'ethers';

import { formatTinyNumber } from '@/utils/formatters/formatTinyNumber';

type Props = {
  value: string;
  decimals?: number;
  className?: string;
};

export const TinyNumber = ({ decimals, value, className }: Props) => {
  const formattedPrice = formatTinyNumber(
    parseFloat(decimals ? formatUnits(value, decimals) : value) ?? 0,
  );

  if (!Array.isArray(formattedPrice)) {
    return <span className={className}>{formattedPrice}</span>;
  }

  return (
    <span className={className}>
      {formattedPrice[0]}
      <span className="px-[1px] align-sub text-[10px]">
        {formattedPrice[1]}
      </span>
      {formattedPrice[2]}
    </span>
  );
};
