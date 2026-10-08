import { Button } from '@aurora-is-near/intents-swap-widget';

import type { Account } from '../../accounts/types';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';
import { TransferTabs } from './TransferTabs';

type Props = {
  title: string;
  account: Account;
};

/** Swap and Send before there's anything in the account to spend. */
export const EmptyAccount = ({ title, account }: Props) => {
  const { back, push } = useNavigation();

  return (
    <Screen
      title={title}
      onBack={back}
      footer={
        <Button
          variant="primary"
          size="lg"
          onClick={() => push({ name: 'deposit' })}>
          Receive funds
        </Button>
      }>
      <TransferTabs value={title === 'Send' ? 'send' : 'swap'} />
      <div className="flex flex-col items-center gap-sw-xl px-sw-md pb-sw-3xl pt-sw-5xl text-center">
        <div className="flex h-[56px] w-[56px] items-center justify-center rounded-sw-lg bg-sw-gray-900 text-sw-gray-200">
          <Icon name={title === 'Send' ? 'send' : 'swap'} size={28} />
        </div>
        <div className="flex flex-col items-center gap-sw-md">
          <h2 className="text-sw-h5 text-sw-gray-50">
            {account.kind === 'wallet'
              ? `Nothing to ${title.toLowerCase()} yet`
              : 'Your account is empty'}
          </h2>
          <p className="max-w-[300px] text-sw-body-md text-sw-gray-200">
            {account.kind === 'wallet'
              ? `Your account and ${account.name} have no tokens.`
              : `${title === 'Send' ? 'Sends' : 'Swaps'} spend your account balance.`}{' '}
            Receive funds from any chain to get started.
          </p>
        </div>
      </div>
    </Screen>
  );
};
