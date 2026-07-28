import ReceiptIcon from 'reicon-react/icons/Receipt';
import WalletPlusIcon from 'reicon-react/icons/WalletPlus';

import { Card } from '@/components/Card';

const CONTENT = {
  connect: {
    Icon: WalletPlusIcon,
    description: 'Connect your wallet to see your transaction history',
  },
  empty: {
    Icon: ReceiptIcon,
    description:
      'Once you make some transactions, the details will appear here.',
  },
} as const;

type Props = {
  type: keyof typeof CONTENT;
};

export const TransactionHistoryEmpty = ({ type }: Props) => {
  const { Icon, description } = CONTENT[type];

  return (
    <Card>
      <div className="flex flex-col items-center justify-center py-sw-3xl text-sw-gray-200 gap-sw-lg">
        <Icon weight="Filled" className="w-sw-4xl h-sw-4xl" />
        <p className="text-sw-body-md text-sw-gray-300 text-center max-w-[265px]">
          {description}
        </p>
      </div>
    </Card>
  );
};
