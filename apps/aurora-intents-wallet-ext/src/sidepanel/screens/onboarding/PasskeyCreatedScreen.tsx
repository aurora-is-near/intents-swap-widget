import { Button, CopyButton } from '@aurora-is-near/intents-swap-widget';

import { useAccounts } from '../../accounts/useAccounts';
import { Screen } from '../../components/Screen';
import { StatusHero } from '../../components/StatusHero';
import { useNavigation } from '../../navigation';
import { shortAddress } from '../../utils';

export const PasskeyCreatedScreen = ({ accountId }: { accountId: string }) => {
  const { accounts } = useAccounts();
  const { reset } = useNavigation();
  const account = accounts.find((item) => item.id === accountId);

  return (
    <Screen
      footer={
        <Button
          variant="primary"
          size="lg"
          onClick={() => reset({ name: 'home' })}>
          Go to wallet
        </Button>
      }>
      <StatusHero
        tone="success"
        title="Your account is ready"
        description={`${account?.name ?? 'Your account'} is protected by your passkey. Deposit from any chain to get started.`}>
        {account && (
          <div className="flex w-full flex-col gap-sw-md rounded-sw-lg bg-sw-gray-900 p-sw-lg">
            <div className="flex items-center justify-between gap-sw-md">
              <div className="flex flex-col gap-sw-xs text-left">
                <span className="text-sw-label-sm text-sw-gray-300">
                  Intents account
                </span>
                <span className="text-sw-label-md text-sw-gray-50">
                  {shortAddress(account.intentsAccountId)}
                </span>
              </div>
              <CopyButton value={account.intentsAccountId} />
            </div>
            {/* The ID is shaped like an EVM address but isn't one. */}
            <p className="m-0 text-left text-sw-body-sm text-sw-gray-400">
              This is not a wallet address. Add funds through your deposit
              addresses.
            </p>
          </div>
        )}
      </StatusHero>
    </Screen>
  );
};
