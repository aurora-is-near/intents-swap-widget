import { Button } from '@aurora-is-near/intents-swap-widget';

import type { Account } from '../../accounts/types';
import { useAccounts } from '../../accounts/useAccounts';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';

const Placeholder = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="flex flex-col items-center gap-sw-xl px-sw-md pb-sw-3xl pt-sw-5xl text-center">
    <div className="flex h-[56px] w-[56px] items-center justify-center rounded-sw-lg bg-sw-gray-900 text-sw-gray-200">
      <Icon name="apps" size={28} />
    </div>
    <div className="flex flex-col items-center gap-sw-md">
      <h2 className="text-sw-h5 text-sw-gray-50">{title}</h2>
      <p className="max-w-[300px] text-sw-body-md text-sw-gray-200">
        {description}
      </p>
    </div>
  </div>
);

/**
 * App integrations (Polymarket, Gauntlet vaults): coming soon. They run
 * through Intents Connect, which doesn't support passkey accounts yet, so
 * those are pointed to a wallet account.
 */
export const AppsScreen = ({ account }: { account: Account }) => {
  const { back, push } = useNavigation();
  const { accounts } = useAccounts();
  const hasWalletAccount = accounts.some((item) => item.kind === 'wallet');

  if (account.kind === 'passkey') {
    return (
      <Screen
        title="Apps"
        onBack={back}
        footer={
          <>
            <Button
              variant="primary"
              size="lg"
              onClick={() => push({ name: 'connectWallet' })}>
              Connect a wallet
            </Button>
            {hasWalletAccount ? (
              <Button
                variant="outlined"
                size="lg"
                onClick={() => push({ name: 'settings' })}>
                Select connected wallet
              </Button>
            ) : null}
          </>
        }>
        <Placeholder
          title="Apps need a wallet account"
          description="App integrations aren’t supported for passkey accounts yet. Connect a wallet to use them."
        />
      </Screen>
    );
  }

  return (
    <Screen title="Apps" onBack={back}>
      <Placeholder
        title="Apps are coming soon"
        description="Deposit into apps like Polymarket and Gauntlet vaults right from your wallet. Integrations will be added here soon."
      />
    </Screen>
  );
};
