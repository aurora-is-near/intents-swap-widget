import { useEffect, useRef, useState } from 'react';

import { Banner, Button, Notes } from '@aurora-is-near/intents-swap-widget';

import {
  nextAccountName,
  nextSecondaryName,
  OwnWalletError,
  useAccounts,
} from '../../accounts/useAccounts';
import { useSelectedWallet } from '../../accounts/useSelectedWallet';
import { Spinner } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { StatusHero } from '../../components/StatusHero';
import { WalletIcon } from '../../components/WalletIcon';
import { useNavigation } from '../../navigation';
import type { ConnectRole } from '../../navigation';
import { connectWallet } from '../../wallet/connectWallet';
import { closeConnector } from '../../wallet/connectorWindow';
import { isAccountVerified } from '../../wallet/walletVerification';
import { FAMILY_NETWORKS } from '../../wallet/families';
import type { DetectedWallet } from '../../wallet/types';

type Step =
  | { name: 'connecting' }
  | { name: 'rejected'; message: string }
  // The account's own wallet can't also be its secondary wallet.
  | { name: 'own'; message: string };

const describeError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const ConnectBrowserWalletScreen = ({
  wallet,
  role,
}: {
  wallet: DetectedWallet;
  role?: ConnectRole;
}) => {
  const { accounts, active, secondaries, add, addSecondary } = useAccounts();
  const { select } = useSelectedWallet();
  const { back, reset, popTo } = useNavigation();
  const [step, setStep] = useState<Step>({ name: 'connecting' });
  const walletName = wallet.info.name;

  const connectAsAccount = async () => {
    const { address, publicKey } = await connectWallet(wallet);

    const added = await add({
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

    // The compatibility check signs next, through the same window: keep it
    // open, or a quick Verify races the close. Verification closes it.
    if (isAccountVerified(added)) {
      void closeConnector();
    }

    reset({ name: 'home' });
  };

  const connectAsSecondary = async (returnTo: ConnectRole['returnTo']) => {
    if (!active) {
      throw new Error('No account to attach the wallet to');
    }

    const { address, publicKey } = await connectWallet(wallet);

    const added = await addSecondary({
      id: crypto.randomUUID(),
      primaryId: active.id,
      name: nextSecondaryName(secondaries, walletName),
      family: wallet.family,
      walletId: wallet.id,
      bridgeId: wallet.bridgeId,
      walletName,
      walletIcon: wallet.info.icon,
      address,
      publicKey,
      createdAt: Date.now(),
    });

    // It only sends transactions, which reopen the window when needed.
    void closeConnector();

    // Connected from a screen that spends from it: spend from it.
    if (returnTo !== 'wallets') {
      select({ kind: 'secondary', id: added.id });
    }

    popTo(returnTo);
  };

  const connect = async () => {
    setStep({ name: 'connecting' });

    try {
      if (role) {
        await connectAsSecondary(role.returnTo);
      } else {
        await connectAsAccount();
      }
    } catch (error) {
      setStep(
        error instanceof OwnWalletError
          ? { name: 'own', message: error.message }
          : { name: 'rejected', message: describeError(error) },
      );
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

  if (step.name === 'own') {
    return (
      <Screen
        title="Browser wallet"
        onBack={back}
        footer={
          <Button variant="primary" size="lg" onClick={back}>
            Choose another wallet
          </Button>
        }>
        <StatusHero
          tone="error"
          title="Already your account’s wallet"
          description={`${step.message} Switch ${walletName} to another account to add it as a secondary wallet, or pick a different wallet.`}
        />
      </Screen>
    );
  }

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
          description={`${walletName} declined the request, so no ${role ? 'wallet' : 'account'} was connected. You can try again or pick another wallet.`}
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
          {role && active ? (
            <Notes.Item label="Secondary wallet of" value={active.name} />
          ) : null}
          <Notes.Item
            label="Requested access"
            value={
              role
                ? 'View address, send transactions'
                : 'View address, request signatures'
            }
          />
          <Notes.Item label="Network" value={FAMILY_NETWORKS[wallet.family]} />
        </Notes>
      </div>
    </Screen>
  );
};
