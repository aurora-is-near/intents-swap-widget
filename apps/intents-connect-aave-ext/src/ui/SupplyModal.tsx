import {
  type ReactNode,
  type Ref,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ExecutionPreview } from '@aurora-is-near/intents-connect';
import {
  IntentsConnectProvider,
  type IntentsConnectProviderProps,
  useIntentsConnectFlow,
  useSupportedTokens,
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
import { AssetsScreen } from './assets/AssetsScreen';
import type { AssetRow } from './assets/useWalletAssets';
import { ProgressScreen } from './progress/ProgressScreen';
import type { SupplyRun } from './progress/types';
import { deliverableOptions } from './supply/options';
import { SupplyForm } from './supply/SupplyForm';
import type { SupplyDestination } from './supply/types';
import { ActiveWalletCard } from './wallets/ActiveWalletCard';
import { PairingScreen } from './wallets/PairingScreen';
import {
  useWalletSession,
  type WalletSession,
} from './wallets/useWalletSession';
import { WalletsScreen } from './wallets/WalletsScreen';

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
  undeliverable,
}: Pick<SupplyModalProps, 'dappName' | 'positionOwner' | 'destination'> & {
  /** Intents Connect can deliver into none of the destination's options. */
  undeliverable: boolean;
}) => {
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
      {undeliverable ? (
        <p className="mt-1 text-text-secondary">
          Aurora can&apos;t deliver into any of its reserves yet.
        </p>
      ) : null}
      {destination.hint ? (
        <p className="mt-1 text-text-secondary">{destination.hint}</p>
      ) : null}
    </Notice>
  );
};

/**
 * The dialog, inside the provider. Mounted from the first opening on, so
 * the runner, and a supply running on it, outlive a close.
 */
const SupplyFlow = ({
  open,
  onClose,
  dappName,
  positionOwner,
  destination,
  walletConnect,
  session,
}: Omit<SupplyModalProps, 'sdk' | 'connectorOptions'> & {
  session: WalletSession;
}) => {
  const supported = useSupportedTokens();
  // One runner: the form previews on it, and the supply runs on it.
  const flow = useIntentsConnectFlow<ExecutionPreview, void>({
    buildPlan: (preview) => preview.plan,
  });

  const options = useMemo(
    () =>
      destination.options &&
      deliverableOptions(destination.options, supported.destinations),
    [destination.options, supported.destinations],
  );

  const optionsSettled = !!options && supported.status === 'success';
  const optionsError = destination.optionsError ?? supported.error;
  const undeliverable = optionsSettled && options.length === 0;

  const [screen, setScreen] = useState<Screen | null>(null);
  // The asset to pay with, for the wallet it was picked from.
  const [picked, setPicked] = useState<{
    walletKey: string;
    row: AssetRow;
  } | null>(null);

  // The supply submitted last; shown until the user leaves it.
  const [run, setRun] = useState<SupplyRun | null>(null);

  const closeRef = useRef<HTMLButtonElement>(null);
  const { active } = session;
  const asset = active && picked?.walletKey === active.key ? picked.row : null;

  // Each opening starts over: a running supply, else the chosen wallet's
  // assets, else the list.
  const close = () => {
    setScreen(null);
    setPicked(null);
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

  const blocked = !positionOwner || !destination.supported || undeliverable;
  const view: 'progress' | 'blocked' | 'loading' | Screen | 'assets' | 'form' =
    (() => {
      // Before anything else: the page may have changed under a running supply.
      if (run) {
        return 'progress';
      }

      if (blocked) {
        return 'blocked';
      }

      if (!session.ready) {
        return 'loading';
      }

      if (screen === 'pairing' && walletConnect) {
        return 'pairing';
      }

      if (screen === 'wallets' || !active) {
        return 'wallets';
      }

      return asset ? 'form' : 'assets';
    })();

  let title = 'Supply with Aurora';
  let onBack: (() => void) | undefined;
  let body: ReactNode;

  switch (view) {
    case 'progress':
      title = flow.exec.phase === 'success' ? 'Supplied' : 'Supplying';
      body = run ? (
        <ProgressScreen
          flow={flow}
          run={run}
          dappName={dappName}
          destinationTitle={destination.title}
          onDone={() => {
            const supplied = flow.exec.phase === 'success';

            setRun(null);

            if (supplied) {
              close();
            }
          }}
        />
      ) : null;
      break;

    case 'blocked':
      body = (
        <Blocker
          dappName={dappName}
          positionOwner={positionOwner}
          destination={destination}
          undeliverable={undeliverable}
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

    case 'assets':
      title = 'Choose an asset';
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
          <AssetsScreen
            onPick={(row) => setPicked({ walletKey: active.key, row })}
          />
        </div>
      ) : null;
      break;

    default:
      title = 'Supply';
      onBack = () => setPicked(null);

      if (optionsError) {
        body = (
          <Notice tone="warning">
            <p className="font-medium">
              Couldn&apos;t load what can be supplied
            </p>
            <p className="mt-1 text-text-secondary">{optionsError.message}</p>
          </Notice>
        );
      } else {
        body = asset ? (
          <SupplyForm
            key={asset.id}
            asset={asset}
            options={options ?? []}
            loadingOptions={!optionsSettled}
            buildPlan={destination.buildPlan}
            dappName={dappName}
            exec={flow.exec}
            onSubmit={(preview, option) => {
              setRun({
                origin: asset.token,
                option,
                walletKey: active!.key,
                quoted: preview.execution,
              });
              void flow.submit(preview);
            }}
          />
        ) : null;
      }
  }

  return open ? (
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
  ) : null;
};

/** The wallet the user pays from, and the provider running on it. */
const SupplySession = ({
  sdk,
  connectorOptions,
  ...props
}: SupplyModalProps) => {
  const session = useWalletSession({
    walletConnect: props.walletConnect,
    connectorOptions,
  });

  return (
    <IntentsConnectProvider {...sdk} wallet={session.active?.connector ?? null}>
      <SupplyFlow {...props} session={session} />
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
