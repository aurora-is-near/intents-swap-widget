import { type ReactNode, useEffect, useRef, useState } from 'react';
import { PAIRING_TTL_MS } from '@aurora-is-near/intents-connect-wallet/connect/walletconnect';

import { Button, CopyButton, Skeleton } from '../ui';
import { QrCode } from './QrCode';

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** A phone pairing: WalletConnect's client and TON Connect's both fit. */
export type Pairer<TPeer> = {
  pair: (onUri: (uri: string) => void) => Promise<TPeer>;
  abortPairing: () => Promise<void>;
};

/** What the screen says for one kind of phone wallet. */
export type PairingCopy = {
  /** Under the QR code: which wallets scan it. */
  hint: string;
  /** Names the copied link, e.g. "WalletConnect link". */
  linkLabel: string;
};

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
const Pairing = <TPeer,>({
  pairer,
  copy,
  below,
  onPaired,
  onRetry,
}: {
  pairer: Pairer<TPeer>;
  copy: PairingCopy;
  below?: ReactNode;
  onPaired: (peer: TPeer) => void;
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
        void pairer.abortPairing();
        setStep({ name: 'expired' });
      }
    }, PAIRING_TTL_MS);

    const tick = setInterval(() => setNow(Date.now()), 1000);

    pairer
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
        void pairer.abortPairing();
      }

      clearTimeout(expiry);
      clearInterval(tick);
    };
  }, [pairer]);

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
        {below ? <div className="w-[280px]">{below}</div> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* As wide as the QR tile: whatever sits below takes its width. */}
      <div className="flex w-fit flex-col gap-2">
        {step.uri ? (
          <QrCode value={step.uri} />
        ) : (
          <Skeleton className="h-[280px] w-[280px]" />
        )}
        {below}
      </div>
      <p className="max-w-[320px] text-center text-text-secondary">
        {copy.hint}
      </p>
      <div className="flex h-6 items-center gap-3 text-text-muted">
        {step.uri ? (
          <span className="inline-flex items-center gap-1">
            Copy link
            <CopyButton value={step.uri} label={copy.linkLabel} />
          </span>
        ) : null}
        <span>Valid for {countdown(Math.max(0, deadline - now))}</span>
      </div>
    </div>
  );
};

/** Pairs a phone wallet by QR code, over WalletConnect or TON Connect. */
export const PairingScreen = <TPeer,>({
  pairer,
  copy,
  below,
  onPaired,
}: {
  pairer: Pairer<TPeer>;
  copy: PairingCopy;
  /** Right under the QR code, as wide as it, e.g. a chain switch. */
  below?: ReactNode;
  onPaired: (peer: TPeer) => void;
}) => {
  const [attempt, setAttempt] = useState(0);

  return (
    <Pairing
      key={attempt}
      pairer={pairer}
      copy={copy}
      below={below}
      onPaired={onPaired}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  );
};
