import { useEffect, useRef, useState } from 'react';

import {
  Banner,
  Button,
  CopyButton,
  Input,
} from '@aurora-is-near/intents-swap-widget';

import { nextAccountName, useAccounts } from '../../accounts/useAccounts';
import { Icon, Spinner } from '../../components/Icon';
import { QrCode } from '../../components/QrCode';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';
import {
  abortWalletConnectPairing,
  PAIRING_TTL_MS,
  pairWalletConnect,
} from '../../wallet/walletConnect';

type Step =
  | { name: 'pairing'; uri: string | null }
  | { name: 'expired' }
  | { name: 'failed'; message: string };

/**
 * A blank stand-in for `QrCode`'s white frame, sized like a typical pairing
 * URI's code (73 modules × 4 px + padding).
 */
const QrPlaceholder = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto flex h-[316px] w-[316px] items-center justify-center rounded-sw-lg bg-[#fff]">
    {children}
  </div>
);

export const WalletConnectScreen = () => {
  const { accounts, add, remove } = useAccounts();
  const { back, push, reset } = useNavigation();
  const [step, setStep] = useState<Step>({ name: 'pairing', uri: null });
  const [attempt, setAttempt] = useState(0);
  // The latest accounts and typed name, for the async completion below.
  const accountsRef = useRef(accounts);
  const [defaultName] = useState(() => nextAccountName(accounts));
  const nameRef = useRef(defaultName);

  accountsRef.current = accounts;

  useEffect(() => {
    let isCurrent = true;

    setStep({ name: 'pairing', uri: null });

    const expiry = setTimeout(() => {
      if (isCurrent) {
        isCurrent = false;
        void abortWalletConnectPairing();
        setStep({ name: 'expired' });
      }
    }, PAIRING_TTL_MS);

    pairWalletConnect((uri) => {
      if (isCurrent) {
        setStep({ name: 'pairing', uri });
      }
    })
      .then(async (peer) => {
        if (!isCurrent) {
          return;
        }

        // One session at a time: pairing replaced the previous mobile wallet.
        const stale = accountsRef.current.filter(
          (account) =>
            account.kind === 'wallet' && account.source === 'walletconnect',
        );

        await Promise.all(stale.map((account) => remove(account.id)));
        await add({
          kind: 'wallet',
          source: 'walletconnect',
          id: crypto.randomUUID(),
          name:
            nameRef.current.trim() ||
            nextAccountName(
              accountsRef.current.filter((account) => !stale.includes(account)),
            ),
          family: 'evm',
          walletId: 'walletconnect',
          bridgeId: 'walletconnect',
          walletName: peer.name,
          walletIcon: peer.icon,
          address: peer.address,
          createdAt: Date.now(),
        });
        reset({ name: 'home' });
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setStep({
            name: 'failed',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      })
      .finally(() => clearTimeout(expiry));

    return () => {
      if (isCurrent) {
        isCurrent = false;
        void abortWalletConnectPairing();
      }

      clearTimeout(expiry);
    };
  }, [attempt]);

  const retry = () => setAttempt((value) => value + 1);

  return (
    <Screen
      title="Mobile wallet"
      onBack={back}
      footer={
        step.name === 'pairing' ? (
          <Button
            variant="outlined"
            size="lg"
            onClick={() => push({ name: 'browserWallets' })}>
            Use a browser wallet instead
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={retry}>
            Generate new code
          </Button>
        )
      }>
      <h2 className="m-0 text-center text-sw-h5 text-sw-gray-50">
        Scan with your mobile wallet
      </h2>
      <p className="m-0 text-center text-sw-body-md text-sw-gray-200">
        Open any WalletConnect-compatible wallet on your phone and scan this
        code.
      </p>

      {step.name === 'pairing' && (
        <>
          {step.uri ? (
            <QrCode value={step.uri} />
          ) : (
            <QrPlaceholder>
              <Spinner size={32} />
            </QrPlaceholder>
          )}
          <div className="flex items-center justify-center gap-sw-md">
            <Spinner size={16} />
            <span className="text-sw-label-sm text-sw-gray-200">
              Waiting for your wallet…
            </span>
          </div>
          {step.uri ? (
            <div className="flex items-center justify-between gap-sw-md rounded-sw-md bg-sw-gray-900 p-sw-lg">
              <div className="flex items-center gap-sw-md text-sw-gray-300">
                <Icon name="link" size={16} />
                <span className="text-sw-label-sm text-sw-gray-200">
                  Copy connection link
                </span>
              </div>
              <CopyButton value={step.uri} />
            </div>
          ) : null}
          <label className="flex flex-col gap-sw-md">
            <span className="text-sw-label-sm text-sw-gray-200">
              Account name
            </span>
            <Input
              defaultValue={defaultName}
              placeholder="Account name"
              maxLength={32}
              onChange={(event) => {
                nameRef.current = event.target.value;
              }}
            />
          </label>
        </>
      )}

      {step.name === 'expired' && (
        <>
          <QrPlaceholder>
            <div className="flex flex-col items-center gap-sw-md text-sw-gray-950">
              <Icon name="refresh" size={32} />
              <span className="text-sw-label-md">QR code expired</span>
            </div>
          </QrPlaceholder>
          <Banner
            variant="warn"
            message="The code expired after 5 minutes. Generate a new one to continue."
            hasBg
            multiline
          />
        </>
      )}

      {step.name === 'failed' && (
        <Banner variant="error" message={step.message} hasBg multiline />
      )}
    </Screen>
  );
};
