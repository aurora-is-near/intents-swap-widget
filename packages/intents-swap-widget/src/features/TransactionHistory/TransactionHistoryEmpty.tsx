import { ScheduleFillW700 as Schedule } from '@material-symbols-svg/react-rounded/icons/schedule';
import { AccountBalanceWalletFillW700 as Wallet } from '@material-symbols-svg/react-rounded/icons/account-balance-wallet';

const CONTENT = {
  connect: {
    Icon: Wallet,
    description: 'Connect your wallet to see your transaction history',
  },
  empty: {
    Icon: Schedule,
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
    <div className="flex flex-col items-center justify-center py-sw-3xl">
      <Icon className="w-[32px] h-[32px] text-sw-gray-200 mb-sw-lg" />

      <p className="text-sw-body-md text-sw-gray-300 text-center max-w-[265px]">
        {description}
      </p>
    </div>
  );
};
