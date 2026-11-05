import { useEffect, useRef, useState } from 'react';
import {
  PAIRING_TTL_MS,
  type WalletConnectClient,
  type WalletConnectPeer,
} from '@aurora-is-near/intents-connect-wallet/connect/walletconnect';

import { Button, CopyButton, Skeleton } from '../ui';
import { QrCode } from './QrCode';

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

type Step =
  | { name: 'pairing'; uri: string | null }
  | { name: 'expired' }
  | { name: 'failed'; message: string };

const countdown = (ms: number) =>
  `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')}`;

/**
 * One pairing attempt: mounting starts it, unmounting abandons it, and a
 * new `key` retries.
 */
const Pairing = ({
  walletConnect,
  onPaired,
  onRetry,
}: {
  walletConnect: WalletConnectClient;
  onPaired: (peer: WalletConnectPeer) => void;
  onRetry: () => void;
}) => {
  const [step, setStep] = useState<Step>({ name: 'pairing', uri: null });
  const [deadline] = useState(() => Date.now() + PAIRING_TTL_MS);
  const [now, setNow] = useState(() => Date.now());
  const paired = useRef(onPaired);

  paired.current = onPaired;

  useEffect(() => {
    let current = true;

    const expiry = setTimeout(() => {
      if (current) {
        current = false;
        void walletConnect.abortPairing();
        setStep({ name: 'expired' });
      }
    }, PAIRING_TTL_MS);

    const tick = setInterval(() => setNow(Date.now()), 1000);

    walletConnect
      .pair((uri) => {
        if (current) {
          setStep({ name: 'pairing', uri });
        }
      })
      .then((peer) => {
        if (current) {
          current = false;
          paired.current(peer);
        }
      })
      .catch((error: unknown) => {
        if (current) {
          current = false;
          setStep({ name: 'failed', message: errorMessage(error) });
        }
      })
      .finally(() => {
        clearTimeout(expiry);
        clearInterval(tick);
      });

    return () => {
      if (current) {
        current = false;
        void walletConnect.abortPairing();
      }

      clearTimeout(expiry);
      clearInterval(tick);
    };
  }, [walletConnect]);

  if (step.name !== 'pairing') {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="font-medium">
          {step.name === 'expired'
            ? 'The QR code expired'
            : "The wallet didn't connect"}
        </p>
        {step.name === 'failed' ? (
          <p className="max-w-[320px] text-danger">{step.message}</p>
        ) : null}
        <Button variant="secondary" onClick={onRetry}>
          Show a new code
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {step.uri ? (
        <QrCode value={step.uri} />
      ) : (
        <Skeleton className="h-[256px] w-[256px]" />
      )}
      <p className="max-w-[320px] text-center text-text-secondary">
        Scan with an EVM wallet on your phone (MetaMask, Rainbow, Trust,
        Coinbase Wallet…), then approve the connection there.
      </p>
      <div className="flex h-6 items-center gap-3 text-text-muted">
        {step.uri ? (
          <span className="inline-flex items-center gap-1">
            Copy link
            <CopyButton value={step.uri} label="WalletConnect link" />
          </span>
        ) : null}
        <span>Valid for {countdown(Math.max(0, deadline - now))}</span>
      </div>
    </div>
  );
};

/** Pairs a phone wallet by QR code, over WalletConnect. */
export const PairingScreen = ({
  walletConnect,
  onPaired,
}: {
  walletConnect: WalletConnectClient;
  onPaired: (peer: WalletConnectPeer) => void;
}) => {
  const [attempt, setAttempt] = useState(0);

  return (
    <Pairing
      key={attempt}
      walletConnect={walletConnect}
      onPaired={onPaired}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  );
};
