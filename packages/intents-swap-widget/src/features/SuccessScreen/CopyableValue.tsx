import { formatAddressTruncate } from '@/utils/formatters/formatAddressTruncate';
import { CopyButton } from '@/components/CopyButton';

type Props = {
  value: string;
};

export const CopyableValue = ({ value }: Props) => (
  <span className="text-sw-gray-50 flex items-center gap-sw-xs bg-sw-gray-800 rounded-full px-sw-sm py-sw-xs">
    {formatAddressTruncate(value, 16)}
    <CopyButton className="scale-80" value={value} />
  </span>
);
