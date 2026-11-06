import {
  type ReactNode,
  type Ref,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  Execution,
  ExecutionPreview,
  StepsPlan,
} from '@aurora-is-near/intents-connect';
import {
  IntentsConnectProvider,
  type IntentsConnectProviderProps,
  useIntentsConnectFlow,
  useSupportedTokens,
} from '@aurora-is-near/intents-connect/react';
import type { WalletConnectClient } from '@aurora-is-near/intents-connect-wallet/connect/walletconnect';
import type { WalletSource } from '@aurora-is-near/intents-connect-wallet/detect';
import type { TonConnectClient } from '@aurora-is-near/intents-connect-wallet/ton';
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
import { ErrorBoundary } from './ErrorBoundary';
import type { HistoryEntry } from './history/entries';
import {
  type FollowableWallet,
  historyWallets,
} from './history/historyWallets';
import { type Follow, HistoryIcon, HistoryView } from './history/HistoryView';
import { DoneNotice } from './progress/DoneNotice';
import { InFlightCheck, ResolveRun } from './progress/InFlightCheck';
import { ProgressScreen } from './progress/ProgressScreen';
import type { SupplyRun } from './progress/types';
import { RecoverScreen, type Recovery } from './recovery/RecoverScreen';
import {
  FailedSupplies,
  type Waiting,
  WaitingNotice,
} from './recovery/WaitingFunds';
import {
  IDLE,
  sameStatus,
  type StatusInput,
  type SupplyStatus,
  supplyStatus,
} from './status';
import { deliverableOptions } from './supply/options';
import { type FormDraft, SupplyForm } from './supply/SupplyForm';
import { type SupplyTheme, ThemeStyle } from './theme';
import type { SupplyDestination, SupplyOption } from './supply/types';
import { ActiveWalletCard } from './wallets/ActiveWalletCard';
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
  /** The dApp's name for the wallet it is connected with, e.g. MetaMask. */
  dappWalletName?: string;
  destination: SupplyDestination;
  /** Intents Connect: the API clients and options, minus the wallet. */
  sdk: Omit<IntentsConnectProviderProps, 'wallet' | 'children'>;
  /** Offers EVM phone wallets by QR when set. */
  walletConnect?: WalletConnectClient;
  /** Offers TON phone wallets by QR when set (extensions are detected). */
  tonConnect?: TonConnectClient;
  /** Per-family adapter options, e.g. `{ sol: { rpcUrl } }`. Keep it stable. */
  connectorOptions?: WalletConnectorOptions;
  /** Detection sources for more families, e.g. `stellarWallets()`. Keep it stable. */
  walletSources?: readonly WalletSource[];
  /** The look: a seed to derive tokens from, and/or exact tokens. Keep it stable. */
  theme?: SupplyTheme;
  /**
   * Shows every screen but never supplies: the supply button shows this
   * notice instead (e.g. a preview of the modal outside the dApp).
   */
  readOnly?: string;
  /** Opens the modal: the completion notice's "View" calls it. */
  onOpen?: () => void;
  /**
   * Every change in the supply's status, closed or open: e.g. to show it on
   * the dApp's own button.
   */
  onStatus?: (status: SupplyStatus) => void;
  /**
   * A supply landed, once per execution: e.g. to refresh the dApp's
   * position data.
   */
  onSupplied?: (supply: { executionId: string; option: SupplyOption }) => void;
  /**
   * The recipe's `intent`, which the dApp's executions carry: History lists
   * only those, across every wallet on the page, and a run another app left
   * in flight isn't shown as the dApp's. No History without it.
   */
  intent?: string;
};

/** How long the completion notice for a success stays up. */
const SUCCESS_NOTICE_MS = 10_000;

/** Screens the user navigates to; otherwise the wallet decides. */
type Screen = 'wallets';

const Header = ({
  title,
  subtitle,
  onBack,
  onHistory,
  onClose,
  closeRef,
  backRef,
  historyRef,
}: {
  title: string;
  /** Left out when empty. */
  subtitle: string;
  onBack?: () => void;
  /** Opens History; left out while it shows. */
  onHistory?: () => void;
  onClose: () => void;
  closeRef: Ref<HTMLButtonElement>;
  backRef: Ref<HTMLButtonElement>;
  historyRef: Ref<HTMLButtonElement>;
}) => (
  <div className="flex items-start gap-2">
    {onBack ? (
      <Button
        ref={backRef}
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
      {subtitle ? (
        <p className="mt-0.5 text-text-secondary">{subtitle}</p>
      ) : null}
    </div>
    {onHistory ? (
      <Button
        ref={historyRef}
        variant="ghost"
        aria-label="History"
        title="History"
        className="mt-0.5"
        onClick={onHistory}>
        <HistoryIcon />
      </Button>
    ) : null}
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
  dappWalletName,
  destination,
  walletConnect,
  tonConnect,
  readOnly,
  onOpen,
  onStatus,
  onSupplied,
  intent,
  session,
}: Omit<
  SupplyModalProps,
  'sdk' | 'connectorOptions' | 'walletSources' | 'theme'
> & {
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

  // The supply submitted last, or found in flight; shown until left.
  const [run, setRun] = useState<SupplyRun | null>(null);
  // Funds a failed supply left, being supplied; kept across a close.
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  // `readOnly`: the supply button was pressed, so its notice shows.
  const [readOnlyShown, setReadOnlyShown] = useState(false);
  // The wallet whose in-flight check settled: once per wallet.
  const [checkedWallet, setCheckedWallet] = useState<string>();
  // History, over any view: the list (`{}`) or one run (`{ id }`).
  const [history, setHistory] = useState<{ id?: string } | null>(null);
  // A run picked in History, shown once its wallet is the active one.
  const [pendingOpen, setPendingOpen] = useState<{
    address: string;
    execution: Execution;
  } | null>(null);

  // What the form held, for the asset it was entered on.
  const [draft, setDraft] = useState<{
    assetId: string;
    value: FormDraft;
  } | null>(null);

  const closeRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLButtonElement>(null);
  const { active } = session;
  const checking =
    !!active && !run && !pendingOpen && checkedWallet !== active.key;

  const onFound = (walletKey: string, found: SupplyRun | null) => {
    setCheckedWallet(walletKey);

    if (!found?.resumed) {
      return;
    }

    setRun(found);

    // Past the deposit, following it prompts nothing: reattach at once.
    if (!found.resumed.waiting) {
      flow.exec.resume(found.resumed.id).catch(() => undefined);
    }
  };

  const asset = active && picked?.walletKey === active.key ? picked.row : null;

  const recover = (waiting: Waiting) => {
    setRun(null);
    setRecovery({ waiting, state: 'idle' });
  };

  const startRecovery = (plan: StepsPlan) => {
    setRecovery(
      (current) =>
        current && { ...current, state: 'running', error: undefined },
    );
    flow.exec.runSteps(plan).then(
      (execution) =>
        setRecovery(
          (current) =>
            current && {
              ...current,
              state: 'success',
              executionId: execution.id,
            },
        ),
      (error: unknown) =>
        setRecovery(
          (current) =>
            current && {
              ...current,
              state: 'failed',
              error: error instanceof Error ? error : new Error(String(error)),
            },
        ),
    );
  };

  // A new run reports the runner's previous phase for a render: its own
  // success or failure counts once it has been seen running.
  const { phase } = flow.exec;
  const terminal =
    phase === 'success' || phase === 'failed' || phase === 'cancelled';

  const seenLive = useRef<SupplyRun | null>(null);

  if (run && !terminal) {
    seenLive.current = run;
  }

  let statusInput: StatusInput = { kind: 'none' };

  if (run) {
    statusInput =
      seenLive.current === run || run.resumed
        ? {
            kind: 'run',
            phase,
            waiting: !!run.resumed?.waiting,
            transferFailed: flow.state === 'FAILED',
            externalDeposit: flow.needsExternalDeposit,
          }
        : {
            kind: 'run',
            phase: 'planning',
            waiting: false,
            transferFailed: false,
            externalDeposit: false,
          };
  } else if (recovery) {
    statusInput = { kind: 'recovery', phase, state: recovery.state };
  }

  const status = supplyStatus(statusInput);
  const lastStatus = useRef<SupplyStatus>(IDLE);
  const report = useRef({ onStatus, onSupplied });

  report.current = { onStatus, onSupplied };

  useEffect(() => {
    if (!sameStatus(lastStatus.current, status)) {
      lastStatus.current = status;
      report.current.onStatus?.(status);
    }
  });

  // Once per execution: the dApp refreshes its positions.
  const supplied = useRef(new Set<string>());
  const landedId = run ? flow.exec.executionId : recovery?.executionId;
  const landedOption = run?.option ?? recovery?.waiting.option;

  useEffect(() => {
    if (
      status.state === 'success' &&
      landedId &&
      landedOption &&
      !supplied.current.has(landedId)
    ) {
      supplied.current.add(landedId);
      report.current.onSupplied?.({
        executionId: landedId,
        option: landedOption,
      });
    }
  }, [status.state, landedId, landedOption]);

  // Ended while the modal was closed: say so in a corner of the page.
  const [notice, setNotice] = useState<'success' | 'failed' | null>(null);
  const previousState = useRef(status.state);

  useEffect(() => {
    const before = previousState.current;

    previousState.current = status.state;

    if (open) {
      setNotice(null);
    } else if (
      (before === 'running' || before === 'action') &&
      (status.state === 'success' || status.state === 'failed')
    ) {
      setNotice(status.state);
    }
  }, [open, status.state]);

  useEffect(() => {
    if (notice !== 'success') {
      return undefined;
    }

    const timer = setTimeout(() => setNotice(null), SUCCESS_NOTICE_MS);

    return () => clearTimeout(timer);
  }, [notice]);

  // Each opening starts over: a running supply, else the chosen wallet's
  // assets, else the list.
  const close = () => {
    setScreen(null);
    setPicked(null);
    setReadOnlyShown(false);
    setHistory(null);
    setPendingOpen(null);
    setDraft(null);
    onClose();
  };

  // Back out of History one level: a run, then the list, then the view.
  const historyBack = () => setHistory(history?.id ? {} : null);

  // Escape is Back while History shows, else it closes.
  const latestEscape = useRef(close);

  latestEscape.current = history ? historyBack : close;

  // History takes focus to its Back, and gives it back to its button.
  const historyOpen = history !== null;
  const wasHistoryOpen = useRef(false);

  useEffect(() => {
    if (historyOpen) {
      backRef.current?.focus();
    } else if (wasHistoryOpen.current) {
      historyRef.current?.focus();
    }

    wasHistoryOpen.current = historyOpen;
  }, [historyOpen, history?.id]);

  // A wallet that never comes back (removed, locked) gives up the run.
  useEffect(() => {
    if (!pendingOpen) {
      return undefined;
    }

    const timer = setTimeout(() => setPendingOpen(null), 8000);

    return () => clearTimeout(timer);
  }, [pendingOpen]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        latestEscape.current();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const blocked = !positionOwner || !destination.supported || undeliverable;
  const destinationLine = positionOwner
    ? `To ${truncateMiddle(positionOwner)} on ${destination.title}`
    : destination.title;

  const view:
    | 'history'
    | 'progress'
    | 'recover'
    | 'blocked'
    | 'loading'
    | Screen
    | 'assets'
    | 'form' = (() => {
    // Over anything: asked for, and left with Back.
    if (history && intent) {
      return 'history';
    }

    // Before anything else: the page may have changed under a running supply.
    if (run) {
      return 'progress';
    }

    // A run picked in History, while its wallet becomes the active one.
    if (pendingOpen) {
      return 'loading';
    }

    if (recovery && destination.buildStepsPlan) {
      return 'recover';
    }

    if (blocked) {
      return 'blocked';
    }

    if (!session.ready || (checking && screen !== 'wallets')) {
      return 'loading';
    }

    if (screen === 'wallets' || !active) {
      return 'wallets';
    }

    return asset ? 'form' : 'assets';
  })();

  let title = 'Supply with Aurora';
  // Choosing what to pay with says what this is for; a running supply and a
  // blocked one say where it goes.
  let subtitle = `To supply an asset to ${dappName} position from any wallet on any chain.`;
  let onBack: (() => void) | undefined;
  let body: ReactNode;

  // Following a run from History: never over a live one (`resume` would
  // refuse, and switching wallets would drop it), never in a preview.
  const currentId = run
    ? (flow.exec.executionId ?? run.resumed?.id)
    : undefined;

  const liveRun = !!run && !terminal && !run.resumed?.waiting;
  const busy = flow.isBusy || recovery?.state === 'running';

  const followOf = ({
    execution,
    wallet,
    label,
    stepsOnly,
  }: HistoryEntry<FollowableWallet>): Follow | undefined => {
    if (
      !!readOnly ||
      stepsOnly ||
      (label !== 'needs-you' && label !== 'in-progress')
    ) {
      return undefined;
    }

    if (execution.id === currentId) {
      return { label: 'Back to it', onClick: () => setHistory(null) };
    }

    if (busy || liveRun) {
      return undefined;
    }

    return {
      label: wallet.active ? 'Open it' : `Open it with ${wallet.name}`,
      onClick: () => {
        setHistory(null);
        setScreen(null);
        setPicked(null);
        setRun(null);
        setPendingOpen({ address: wallet.address, execution });

        if (!wallet.active) {
          Promise.resolve(wallet.select()).catch(() => setPendingOpen(null));
        }
      },
    };
  };

  // A failed supply from the active wallet: what it left, to supply.
  const extraOf = ({ execution, wallet }: HistoryEntry<FollowableWallet>) => {
    const option = options?.find(
      (candidate) =>
        candidate.destinationAsset === execution.quote?.destinationAsset,
    );

    return execution.status === 'OPERATION_FAILED' &&
      wallet.active &&
      option ? (
      <WaitingNotice
        option={option}
        dappName={dappName}
        onSupply={
          !readOnly && destination.buildStepsPlan
            ? (waiting) => {
                setHistory(null);
                recover(waiting);
              }
            : undefined
        }
      />
    ) : null;
  };

  const wallets = useMemo(
    () => historyWallets(session),
    // `session` is rebuilt every render; these are what it's made of.
    [session.wallets, session.peer, session.tonPeer, session.active?.address],
  );

  switch (view) {
    case 'history':
      title = 'History';
      subtitle = history?.id
        ? ''
        : `Supplies to ${dappName} from the wallets on this page.`;
      onBack = historyBack;
      body = intent ? (
        <ErrorBoundary onReset={() => setHistory(null)}>
          <HistoryView
            wallets={wallets}
            intent={intent}
            dappName={dappName}
            selectedId={history?.id}
            onSelect={(id) => setHistory(id ? { id } : {})}
            onChooseWallet={() => {
              setHistory(null);
              setScreen('wallets');
            }}
            live={
              currentId
                ? { id: currentId, status: flow.exec.status }
                : undefined
            }
            followOf={followOf}
            extraOf={extraOf}
          />
        </ErrorBoundary>
      ) : null;
      break;

    case 'progress':
      title = flow.exec.phase === 'success' ? 'Supplied' : 'Supplying';
      subtitle = destinationLine;
      body = run ? (
        <ProgressScreen
          flow={flow}
          run={run}
          dappName={dappName}
          destinationTitle={destination.title}
          onSwitchWallet={() => {
            setRun(null);
            setScreen('wallets');
          }}
          onAttach={() =>
            setRun((current) =>
              current?.resumed
                ? {
                    ...current,
                    resumed: { ...current.resumed, waiting: false },
                  }
                : current,
            )
          }
          onRecover={
            !readOnly && destination.buildStepsPlan ? recover : undefined
          }
          onDone={() => {
            const succeeded = flow.exec.phase === 'success';

            setRun(null);

            if (succeeded) {
              close();
            }
          }}
        />
      ) : null;
      break;

    case 'recover':
      title = "Supply what's waiting";
      subtitle = destinationLine;
      onBack =
        recovery?.state === 'running' ? undefined : () => setRecovery(null);
      body =
        recovery && destination.buildStepsPlan ? (
          <RecoverScreen
            exec={flow.exec}
            recovery={recovery}
            buildStepsPlan={destination.buildStepsPlan}
            dappName={dappName}
            destinationTitle={destination.title}
            onStart={startRecovery}
            onRetry={() =>
              setRecovery((current) => current && { ...current, state: 'idle' })
            }
            onDone={() => {
              setRecovery(null);
              close();
            }}
          />
        ) : null;
      break;

    case 'blocked':
      subtitle = destinationLine;
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

    case 'wallets':
      title = 'Choose a wallet';
      body = (
        <WalletsScreen
          session={session}
          dappName={dappName}
          dappAccount={positionOwner}
          dappWalletName={dappWalletName}
          walletConnect={walletConnect}
          tonConnect={tonConnect}
          onPicked={() => setScreen(null)}
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
          {options ? (
            <FailedSupplies
              key={active.key}
              options={options}
              dappName={dappName}
              onSupply={
                !readOnly && destination.buildStepsPlan ? recover : undefined
              }
            />
          ) : null}
          <AssetsScreen
            onPick={(row) => setPicked({ walletKey: active.key, row })}
          />
        </div>
      ) : null;
      break;

    default:
      title = 'Supply';
      subtitle = '';
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
          <>
            <SupplyForm
              key={asset.id}
              asset={asset}
              options={options ?? []}
              loadingOptions={!optionsSettled}
              buildPlan={destination.buildPlan}
              dappName={dappName}
              exec={flow.exec}
              draft={draft?.assetId === asset.id ? draft.value : undefined}
              onDraft={(value) => setDraft({ assetId: asset.id, value })}
              onSubmit={(preview, option) => {
                if (readOnly) {
                  setReadOnlyShown(true);

                  return;
                }

                setRun({
                  origin: asset.token,
                  option,
                  walletKey: active!.key,
                  quoted: preview.execution,
                });
                void flow.submit(preview);
              }}
            />
            {readOnly && readOnlyShown ? (
              <div className="mt-3">
                <Notice tone="info">
                  <p className="text-text-secondary">{readOnly}</p>
                </Notice>
              </div>
            ) : null}
          </>
        ) : null;
      }
  }

  const opening =
    pendingOpen && active?.address === pendingOpen.address ? (
      <ResolveRun
        key={pendingOpen.execution.id}
        execution={pendingOpen.execution}
        walletKey={active.key}
        options={options}
        onDone={(found) => {
          setPendingOpen(null);
          onFound(active.key, found);
        }}
      />
    ) : null;

  const check = (
    <>
      {checking && active ? (
        <InFlightCheck
          key={active.key}
          intent={intent}
          walletKey={active.key}
          options={options}
          onDone={(found) => onFound(active.key, found)}
        />
      ) : null}
      {opening}
    </>
  );

  return open ? (
    <div
      className="fixed inset-0 flex items-center justify-center bg-overlay p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}>
      {/* As tall as its content; past the window's height, the body scrolls
          under the header. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aurora-supply-title"
        className="flex max-h-full w-full max-w-[420px] flex-col rounded-dialog bg-surface text-text-primary shadow-dialog">
        <div className="px-6 pt-6">
          <Header
            title={title}
            subtitle={subtitle}
            onBack={onBack}
            onHistory={intent && !history ? () => setHistory({}) : undefined}
            onClose={close}
            closeRef={closeRef}
            backRef={backRef}
            historyRef={historyRef}
          />
        </div>
        {/* Padded inside the scroll area, so outline rings aren't clipped. */}
        <div className="min-h-0 overflow-y-auto px-6 pt-4 pb-6">
          {check}
          <ErrorBoundary onReset={close}>{body}</ErrorBoundary>
        </div>
      </div>
    </div>
  ) : (
    <>
      {check}
      {notice ? (
        <DoneNotice
          success={notice === 'success'}
          dappName={dappName}
          destinationTitle={destination.title}
          onView={
            onOpen
              ? () => {
                  setNotice(null);
                  onOpen();
                }
              : undefined
          }
          onDismiss={() => setNotice(null)}
        />
      ) : null}
    </>
  );
};

/** The wallet the user pays from, and the provider running on it. */
const SupplySession = ({
  sdk,
  connectorOptions,
  walletSources,
  theme,
  ...props
}: SupplyModalProps) => {
  const session = useWalletSession({
    walletConnect: props.walletConnect,
    tonConnect: props.tonConnect,
    connectorOptions,
    walletSources,
  });

  return (
    <IntentsConnectProvider {...sdk} wallet={session.active?.connector ?? null}>
      <ThemeStyle theme={theme} />
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
