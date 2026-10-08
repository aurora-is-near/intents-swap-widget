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
  const isPrimary = source.kind === 'primary';
  const verb = title.toLowerCase();

  return (
    <Screen
      title={title}
      onBack={back}
      className="gap-sw-md"
      footer={
        isPrimary ? (
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
            {isPrimary
              ? `Nothing to ${verb} yet`
              : `Nothing to ${verb} in ${sourceName}`}
          </h2>
          <p className="max-w-[300px] text-sw-body-md text-sw-gray-200">
            {(() => {
              if (!isPrimary) {
                return `No tokens were found in ${sourceName}. Pick another wallet above.`;
              }

              return account.kind === 'wallet'
                ? `Your account and ${account.name} have no tokens. Receive funds from any chain, or pick another wallet above.`
                : 'Your account is empty. Receive funds from any chain, or pick a wallet above.';
            })()}
          </p>
        </div>
      </div>
    </Screen>
  );
};
