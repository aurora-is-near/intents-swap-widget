import { Button } from '@aurora-is-near/intents-swap-widget';

import type { Account } from '../../accounts/types';
import type { TransferSource } from '../../accounts/useTransferSource';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';
import { SourceRow } from './SourceRow';
import { TransferTabs } from './TransferTabs';

type Props = {
  title: 'Swap' | 'Send';
  account: Account;
  source: TransferSource;
  /** The spending wallet's name, or "your account". */
  sourceName: string;
  onChangeSource: (source: TransferSource) => void;
};

/** Swap and Send when the spending source has nothing to spend. */
export const EmptyAccount = ({
  title,
  account,
  source,
  sourceName,
  onChangeSource,
}: Props) => {
  const { back, push } = useNavigation();
  const screen = title === 'Send' ? 'send' : 'swap';
  const isAccount = source.kind === 'account';

  return (
    <Screen
      title={title}
      onBack={back}
      className="gap-sw-md"
      footer={
        isAccount ? (
          <Button
            variant="primary"
            size="lg"
            onClick={() => push({ name: 'deposit' })}>
            Receive funds
          </Button>
        ) : null
      }>
      <TransferTabs value={screen} />
      <SourceRow account={account} screen={screen} onChange={onChangeSource} />
      <div className="flex flex-col items-center gap-sw-xl px-sw-md pb-sw-3xl pt-sw-5xl text-center">
        <div className="flex h-[56px] w-[56px] items-center justify-center rounded-sw-lg bg-sw-gray-900 text-sw-gray-200">
          <Icon name={title === 'Send' ? 'send' : 'swap'} size={28} />
        </div>
        <div className="flex flex-col items-center gap-sw-md">
          <h2 className="text-sw-h5 text-sw-gray-50">
            {isAccount
              ? 'Your account is empty'
              : `Nothing to ${title.toLowerCase()} in ${sourceName}`}
          </h2>
          <p className="max-w-[300px] text-sw-body-md text-sw-gray-200">
            {isAccount
              ? `${title === 'Send' ? 'Sends' : 'Swaps'} from your account spend its NEAR Intents balance. Receive funds from any chain, or spend from a wallet.`
              : `No tokens were found in ${sourceName}. Pick another wallet or your account above.`}
          </p>
        </div>
      </div>
    </Screen>
  );
};
