import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { PAIRING_TTL_MS } from '@aurora-is-near/intents-connect-wallet/connect/walletconnect';

import { deepActiveElement, focusIsLost, useAnnounce } from '../a11y';
import { Button, CopyButton, Skeleton } from '../ui';
import { QR_TILE, QrCode } from './QrCode';

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
  /** The QR code, for screen readers. */
  qrLabel: string;
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
  const area = useRef<HTMLDivElement>(null);
  const retry = useRef<HTMLButtonElement>(null);
  const announce = useAnnounce();

  paired.current = onPaired;

  // The code gone: said, and focus (if it was here, or lost with the copy
  // button) moves to the way to a new one. Before the focus trap's own
  // rescue, which waits a microtask.
  useLayoutEffect(() => {
    if (step.name === 'pairing') {
      return;
    }

    announce(
      step.name === 'expired'
        ? 'The QR code expired. Show a new code to try again.'
        : "The wallet didn't connect.",
      step.name === 'expired' ? 'polite' : 'assertive',
    );

    const active = deepActiveElement();

    if (focusIsLost(active) || area.current?.contains(active)) {
      retry.current?.focus();
    }
  }, [step.name, announce]);

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

  const tile = { width: QR_TILE, height: QR_TILE };
  let code: ReactNode;

  if (step.name !== 'pairing') {
    // Where the code was, at its size: nothing around it moves.
    code = (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-card bg-surface-raised p-6 text-center shadow-box"
        style={tile}>
        <p className="font-medium">
          {step.name === 'expired'
            ? 'The QR code expired'
            : "The wallet didn't connect"}
        </p>
        {step.name === 'failed' ? (
          <p className="line-clamp-4 text-danger">{step.message}</p>
        ) : null}
        <Button ref={retry} variant="secondary" onClick={onRetry}>
          Show a new code
        </Button>
      </div>
    );
  } else if (step.uri) {
    code = <QrCode value={step.uri} label={copy.qrLabel} />;
  } else {
    code = <Skeleton style={tile} />;
  }

  return (
    <div ref={area} className="flex flex-col items-center gap-3">
      {/* As wide as the QR tile: whatever sits below takes its width. */}
      <div className="flex w-fit flex-col gap-2">
        {code}
        {below}
      </div>
      <p className="max-w-[320px] text-center text-text-secondary">
        {copy.hint}
      </p>
      <div className="flex h-6 items-center gap-3 text-text-muted">
        {step.name === 'pairing' && step.uri ? (
          <CopyButton
            value={step.uri}
            label={copy.linkLabel}
            text="Copy link"
          />
        ) : null}
        {step.name === 'pairing' ? (
          <span>Valid for {countdown(Math.max(0, deadline - now))}</span>
        ) : null}
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
