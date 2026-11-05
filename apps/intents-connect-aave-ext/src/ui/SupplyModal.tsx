import { type ReactNode, type Ref, useEffect, useRef, useState } from 'react';
import {
  IntentsConnectProvider,
  type IntentsConnectProviderProps,
} from '@aurora-is-near/intents-connect/react';
import type { WalletConnectClient } from '@aurora-is-near/intents-connect-wallet/connect/walletconnect';
import type { WalletConnectorOptions } from '@aurora-is-near/intents-connect-wallet/detect/connector';

import {
  BackIcon,
  Button,
  CloseIcon,
  Notice,
  Skeleton,
  truncateMiddle,
} from './ui';
import { ActiveWalletCard } from './wallets/ActiveWalletCard';
import { PairingScreen } from './wallets/PairingScreen';
import {
  useWalletSession,
  type WalletSession,
} from './wallets/useWalletSession';
import { WalletsScreen } from './wallets/WalletsScreen';

export type SupplyDestination = {
  /** Where the supply lands, e.g. "Aave Core V3 · Ethereum". */
  title: string;
  /** False: the dApp is on a market Intents Connect can't supply to. */
  supported: boolean;
  /** Shown when unsupported: what the user can do instead. */
  hint?: string;
};

type SupplyModalProps = {
  open: boolean;
  onClose: () => void;
  /** The dApp's name, as the copy refers to it. */
  dappName: string;
  /** The account the supply is made for: the one connected on the dApp. */
  positionOwner: string | null;
  destination: SupplyDestination;
  /** Intents Connect: the API clients and options, minus the wallet. */
  sdk: Omit<IntentsConnectProviderProps, 'wallet' | 'children'>;
  /** Offers phone wallets by QR when set. */
  walletConnect?: WalletConnectClient;
  /** Per-family adapter options, e.g. `{ sol: { rpcUrl } }`. Keep it stable. */
  connectorOptions?: WalletConnectorOptions;
};

/** Screens the user navigates to; otherwise the wallet decides. */
type Screen = 'wallets' | 'pairing';

const Header = ({
  title,
  subtitle,
  onBack,
  onClose,
  closeRef,
}: {
  title: string;
  subtitle: string;
  onBack?: () => void;
  onClose: () => void;
  closeRef: Ref<HTMLButtonElement>;
}) => (
  <div className="mb-4 flex items-start gap-2">
    {onBack ? (
      <Button
        variant="ghost"
        aria-label="Back"
        className="-ml-1 mt-0.5"
        onClick={onBack}>
        <BackIcon />
      </Button>
    ) : null}
    <div className="min-w-0 flex-1">
      <h2 id="aurora-supply-title" className="text-base font-medium leading-6">
        {title}
      </h2>
      <p className="mt-0.5 truncate text-text-secondary">{subtitle}</p>
    </div>
    <Button
      ref={closeRef}
      variant="ghost"
      aria-label="Close"
      className="-mr-1 mt-0.5"
      onClick={onClose}>
      <CloseIcon />
    </Button>
  </div>
);

/** What the dApp must sort out before anything can be supplied. */
const Blocker = ({
  dappName,
  positionOwner,
  destination,
}: Pick<SupplyModalProps, 'dappName' | 'positionOwner' | 'destination'>) => {
  if (!positionOwner) {
    return (
      <Notice tone="warning">
        <p className="font-medium">Connect your wallet on {dappName} first</p>
        <p className="mt-1 text-text-secondary">
          Aurora supplies to the account {dappName} is connected with, so it
          shows up in Your supplies.
        </p>
      </Notice>
    );
  }

  return (
    <Notice tone="warning">
      <p className="font-medium">This market isn&apos;t supported yet</p>
      {destination.hint ? (
        <p className="mt-1 text-text-secondary">{destination.hint}</p>
      ) : null}
    </Notice>
  );
};

/**
 * The dialog and the wallet behind it. Mounted from the first opening on,
 * so the chosen wallet (and, later, a running supply) outlives a close.
 */
const SupplySession = ({
  open,
  onClose,
  dappName,
  positionOwner,
  destination,
  sdk,
  walletConnect,
  connectorOptions,
}: SupplyModalProps) => {
  const session: WalletSession = useWalletSession({
    walletConnect,
    connectorOptions,
  });

  const [screen, setScreen] = useState<Screen | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { active } = session;

  // Each opening starts over: the chosen wallet, or the list.
  const close = () => {
    setScreen(null);
    onClose();
  };

  const latestClose = useRef(close);

  latestClose.current = close;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        latestClose.current();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const blocked = !positionOwner || !destination.supported;
  const view: 'blocked' | 'loading' | Screen | 'wallet' = (() => {
    if (blocked) {
      return 'blocked';
    }

    if (!session.ready) {
      return 'loading';
    }

    if (screen === 'pairing' && walletConnect) {
      return 'pairing';
    }

    return screen === 'wallets' || !active ? 'wallets' : 'wallet';
  })();

  let title = 'Supply with Aurora';
  let onBack: (() => void) | undefined;
  let body: ReactNode;

  switch (view) {
    case 'blocked':
      body = (
        <Blocker
          dappName={dappName}
          positionOwner={positionOwner}
          destination={destination}
        />
      );
      break;

    case 'loading':
      body = <Skeleton className="h-[220px]" />;
      break;

    case 'pairing':
      title = 'Connect your phone';
      onBack = () => setScreen('wallets');
      body = (
        <PairingScreen
          walletConnect={walletConnect!}
          onPaired={(peer) => {
            session.selectPhone(peer);
            setScreen(null);
          }}
        />
      );
      break;

    case 'wallets':
      title = 'Choose a wallet';
      body = (
        <WalletsScreen
          session={session}
          dappName={dappName}
          dappAccount={positionOwner}
          canPair={!!walletConnect}
          onPicked={() => setScreen(null)}
          onPair={() => setScreen('pairing')}
        />
      );
      break;

    default:
      onBack = () => setScreen('wallets');
      body = active ? (
        <div className="flex flex-col gap-4">
          <ActiveWalletCard
            wallet={active}
            onDisconnect={async () => {
              await session.disconnect();
              setScreen(null);
            }}
          />
          <Notice tone="info">
            <p className="font-medium">Your assets show up here next</p>
            <p className="mt-1 text-text-secondary">
              Pick one, choose what to supply, and Aurora bridges it in.
            </p>
          </Notice>
        </div>
      ) : null;
  }

  return (
    <IntentsConnectProvider {...sdk} wallet={active?.connector ?? null}>
      {open ? (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/32 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              close();
            }
          }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="aurora-supply-title"
            className="w-full max-w-[420px] rounded-xl bg-surface p-6 text-text-primary shadow-dialog">
            <Header
              title={title}
              subtitle={
                positionOwner
                  ? `To ${truncateMiddle(positionOwner)} on ${destination.title}`
                  : destination.title
              }
              onBack={onBack}
              onClose={close}
              closeRef={closeRef}
            />
            {body}
          </div>
        </div>
      ) : null}
    </IntentsConnectProvider>
  );
};

/**
 * "Supply with Aurora": pay from any wallet, on any chain, into the
 * position of the account connected on the dApp. Everything page- and
 * protocol-specific comes in through props.
 */
export const SupplyModal = (props: SupplyModalProps) => {
  // Nothing (no wallet detection, no relay) until the first opening.
  const [started, setStarted] = useState(props.open);

  if (props.open && !started) {
    setStarted(true);
  }

  return started ? <SupplySession {...props} /> : null;
};
