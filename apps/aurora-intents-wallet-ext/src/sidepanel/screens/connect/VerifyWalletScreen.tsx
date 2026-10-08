import { WalletCompatibilityCheck } from '@aurora-is-near/intents-swap-widget';

import type { WalletAccount } from '../../accounts/types';
import { useAccounts } from '../../accounts/useAccounts';
import { AccountSummary } from '../../components/AccountSummary';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';
import { closeConnector } from '../../wallet/connectorWindow';
import { disconnectWalletConnect } from '../../wallet/walletConnect';
import { isAccountVerified } from '../../wallet/walletVerification';

/**
 * The widget's wallet compatibility check, before a connected wallet reaches
 * Home: it signs a message that intents.near must accept. The widget records
 * the result, so each wallet is asked once per device.
 */
export const VerifyWalletScreen = ({ account }: { account: WalletAccount }) => {
  const { accounts, remove } = useAccounts();
  const { reset } = useNavigation();

  const signOut = async () => {
    if (account.source === 'walletconnect') {
      await disconnectWalletConnect().catch(() => undefined);
    }

    await remove(account.id);
    reset({ name: accounts.length > 1 ? 'home' : 'welcome' });
  };

  const finish = async () => {
    void closeConnector();

    // Closing before the check passed leaves a wallet that can't be used.
    if (isAccountVerified(account)) {
      reset({ name: 'home' });
    } else {
      await signOut();
    }
  };

  return (
    // Same inset on every side; the check fills the height under the card.
    <Screen className="pt-sw-xl">
      <div className="flex shrink-0 items-center rounded-sw-lg bg-sw-gray-900 p-sw-lg">
        <AccountSummary account={account} />
      </div>
      <WalletCompatibilityCheck
        hideCloseButton
        isFullHeight
        onMsg={(msg) => {
          if (msg.type === 'on_sign_out') {
            void closeConnector();
            void signOut();
          } else {
            void finish();
          }
        }}
      />
    </Screen>
  );
};
