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
  <li className="py-ds-md flex items-center justify-between">
    <span className="text-label-s text-gray-100">{label}</span>
    <div className="gap-ds-md flex items-center">
      <span className="text-label-s text-mauve-300">{formatTxHash(value)}</span>
      {!!externalUrl && <ExternalAction url={externalUrl} />}
      {hasCopyAction && <CopyButton value={value} />}
    </div>
  </li>
);
