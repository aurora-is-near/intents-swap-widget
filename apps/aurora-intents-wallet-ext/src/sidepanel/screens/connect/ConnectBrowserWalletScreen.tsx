import { useEffect, useRef, useState } from 'react';

import { Banner, Button, Notes } from '@aurora-is-near/intents-swap-widget';

import { nextAccountName, useAccounts } from '../../accounts/useAccounts';
import { Spinner } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { StatusHero } from '../../components/StatusHero';
import { WalletIcon } from '../../components/WalletIcon';
import { useNavigation } from '../../navigation';
import { connectWallet } from '../../wallet/connectWallet';
import { closeConnector } from '../../wallet/connectorWindow';
import { FAMILY_NETWORKS } from '../../wallet/families';
import type { DetectedWallet } from '../../wallet/types';

type Step = { name: 'connecting' } | { name: 'rejected'; message: string };

const describeError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const ConnectBrowserWalletScreen = ({
  wallet,
}: {
  wallet: DetectedWallet;
}) => {
  const { accounts, add } = useAccounts();
  const { back, reset } = useNavigation();
  const [step, setStep] = useState<Step>({ name: 'connecting' });
  const walletName = wallet.info.name;

  const connect = async () => {
    setStep({ name: 'connecting' });

    try {
      const { address, publicKey } = await connectWallet(wallet);

      await add({
        kind: 'wallet',
        id: crypto.randomUUID(),
        name: nextAccountName(accounts),
        family: wallet.family,
        walletId: wallet.id,
        bridgeId: wallet.bridgeId,
        walletName,
        walletIcon: wallet.info.icon,
        address,
        publicKey,
        createdAt: Date.now(),
      });

      reset({ name: 'home' });
    } catch (error) {
      setStep({ name: 'rejected', message: describeError(error) });
    } finally {
      // Opened for this prompt; signing reopens it when it needs the wallet.
      void closeConnector();
    }
  };

  // Ask once on arrival: the list tap is the user's intent to connect.
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      void connect();
    }
  }, []);

  if (step.name === 'rejected') {
    return (
      <Screen
        title="Browser wallet"
        onBack={back}
        footer={
          <>
            <Button variant="primary" size="lg" onClick={connect}>
              Try again
            </Button>
            <Button variant="outlined" size="lg" onClick={back}>
              Choose another wallet
            </Button>
          </>
        }>
        <StatusHero
          tone="error"
          title="Connection rejected"
          description={`${walletName} declined the request, so no account was connected. You can try again or pick another wallet.`}
        />
        <Banner variant="error" message={step.message} hasBg multiline />
      </Screen>
    );
  }

  return (
    <Screen
      title="Browser wallet"
      onBack={back}
      footer={
        <>
          <Button variant="primary" size="lg" state="loading">
            Waiting for approval
          </Button>
          <Button variant="outlined" size="lg" onClick={back}>
            Cancel
          </Button>
        </>
      }>
      <div className="flex flex-col items-center gap-sw-xl px-sw-md pb-sw-3xl pt-sw-5xl text-center">
        <div className="relative h-[72px] w-[72px]">
          <WalletIcon name={walletName} icon={wallet.info.icon} size={72} />
          <div className="absolute -bottom-[6px] -right-[6px] flex h-[32px] w-[32px] items-center justify-center rounded-full bg-sw-gray-950">
            <Spinner size={22} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-sw-md">
          <h2 className="m-0 text-sw-h5 text-sw-gray-50">
            Approve in {walletName}
          </h2>
          <p className="m-0 max-w-[300px] text-sw-body-md text-sw-gray-200">
            Open the {walletName} extension and approve the connection request.
            Check the toolbar if the window didn’t pop up.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-sw-md rounded-sw-lg bg-sw-gray-900 p-sw-xl">
        <Notes>
          <Notes.Item label="Wallet" value={walletName} />
          <Notes.Item
            label="Requested access"
            value="View address, request signatures"
          />
          <Notes.Item label="Network" value={FAMILY_NETWORKS[wallet.family]} />
        </Notes>
      </div>
    </Screen>
  );
};
