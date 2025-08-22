import { CopyButton } from '@/components/CopyButton';
import { formatTxHash } from '@/utils/formatters/formatTxHash';

import { ExternalAction } from './ExternalAction';

type Props = {
  label: string;
  value: string;
  hasCopyAction?: boolean;
  externalUrl?: string;
};

export const SummaryItem = ({
  label,
  value,
  hasCopyAction,
  externalUrl,
}: Props) => (
  <li className="py-sw-md flex items-center justify-between">
    <span className="text-sw-label-s text-sw-gray-100">{label}</span>
    <div className="gap-sw-md flex items-center">
      <span className="text-sw-label-s text-sw-mauve-300">{formatTxHash(value)}</span>
      {!!externalUrl && <ExternalAction url={externalUrl} />}
      {hasCopyAction && <CopyButton value={value} />}
    </div>
  </li>
);
