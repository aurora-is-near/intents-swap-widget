import { useEffect, useRef, useState } from 'react';

import { EVM_CHAINS } from '@aurora-is-near/intents-connect';
import {
  Accordion,
  Banner,
  Button,
  CopyButton,
  fireEvent,
  Notes,
  TokenInput,
  useStoreSideEffects,
  useTokenInputPair,
  useTokens,
  useUnsafeSnapshot,
} from '@aurora-is-near/intents-swap-widget';
import type { Token } from '@aurora-is-near/intents-swap-widget';
import {
  cn,
  isNotEmptyAmount,
} from '@aurora-is-near/intents-swap-widget/utils';

import { useAccounts } from '../../accounts/useAccounts';
import { FAMILY_NETWORKS } from '../../wallet/families';
import { useTransferSource } from '../../accounts/useTransferSource';
import type { TransferSource } from '../../accounts/useTransferSource';
import { useAppsRuntime } from '../../apps/AppsRuntime';
import { PUSD_DECIMALS, USDC_DECIMALS } from '../../apps/polymarket/constants';
import { STATUS_COPIES } from '../../apps/polymarket/copies';
import { useDeposit } from '../../apps/polymarket/useDeposit';
import { useIntermediaryBalances } from '../../apps/polymarket/useIntermediaryBalances';
import { usePolymarketAccount } from '../../apps/polymarket/usePolymarketAccount';
import { usePolymarketBalance } from '../../apps/polymarket/usePolymarketBalance';
import { usePreview } from '../../apps/polymarket/usePreview';
import { findIntegrationByIntent, INTEGRATIONS } from '../../apps/registry';
import { friendlyError, isDeclined, isStopped } from '../../apps/errorMessages';
import { isInFlight, useAppExecutions } from '../../apps/useAppExecutions';
import { useCloseConnectorWhenIdle } from '../../apps/useCloseConnectorWhenIdle';
import { Icon } from '../../components/Icon';
import { QrCode } from '../../components/QrCode';
import { Screen } from '../../components/Screen';
import { StatusHero } from '../../components/StatusHero';
import { useAccountAssets } from '../../home/useAccountAssets';
import { useNavigation } from '../../navigation';
import { formatAmount, shortAddress } from '../../utils';
import { chainLabel, formatTokenAmount } from '../transfer/summary';
import { TokenPicker } from '../transfer/TokenPicker';
import { sourceOptions } from '../transfer/walletOptions';
import { WalletPicker } from '../transfer/WalletPicker';
import { NotesCard } from '../transfer/TransferStatus';
import { DepositSteps, stepStates } from './DepositSteps';
import { PolymarketAccountCard } from './PolymarketAccountCard';

const POLYMARKET = INTEGRATIONS[0]!;
const TITLE = 'Polymarket';

/** USDC / pUSD atomic (6 decimals) as text: `249.58`. */
const usd6 = (atomic: string | bigint | undefined, decimals = USDC_DECIMALS) =>
  atomic === undefined || atomic === ''
    ? ''
    : formatAmount(Number(atomic) / 10 ** decimals);

/** The family a token's chain belongs to, to tell whether a wallet can send it. */
const familyOf = (token: Token) => {
  if (token.blockchain === 'sol') {
    return 'sol';
  }

  if (token.blockchain === 'near') {
    return 'near';
  }

  return EVM_CHAINS.has(token.blockchain) ? 'evm' : 'other';
};

/** Seconds left until `deadline`, ticking. */
const useSecondsLeft = (deadline: string | undefined) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!deadline) {
      return;
    }

    const timer = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  return deadline
    ? Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000))
    : null;
};

const mmss = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

type Submitted = {
  token: Token;
  /** Atomic. */
  amount: string;
  depositViaWallet: boolean;
  /** The wallet that sends the transfer (the account signs). */
  payerName?: string;
  startedAt: number;
};

/** A "Pay with" option's radio mark. */
const Radio = ({ isSelected }: { isSelected: boolean }) => (
  <span
    className={cn(
      'block h-[16px] w-[16px] shrink-0 rounded-full',
      isSelected
        ? 'shadow-[inset_0_0_0_5px_var(--c-sw-accent-300)]'
        : 'shadow-[inset_0_0_0_2px_var(--c-sw-gray-600)]',
    )}
  />
);

const PayWithTile = ({
  isSelected,
  icon,
  title,
  detail,
  isDisabled,
  onSelect,
}: {
  isSelected: boolean;
  icon: 'browser' | 'qr';
  title: string;
  detail: string;
  isDisabled: boolean;
  onSelect: () => void;
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={isSelected}
    disabled={isDisabled}
    onClick={onSelect}
    className={cn(
      'flex min-w-[0px] flex-1 flex-col gap-sw-md rounded-sw-md p-sw-lg text-left transition-colors disabled:opacity-60',
      isSelected
        ? 'bg-sw-gray-800 shadow-[inset_0_0_0_1px_var(--c-sw-accent-300)]'
        : 'bg-sw-gray-900 hover:bg-sw-gray-800',
    )}>
    <span className="flex items-center justify-between text-sw-gray-200">
      <Icon name={icon} size={18} />
      <Radio isSelected={isSelected} />
    </span>
    <span className="flex flex-col gap-sw-xxs">
      <span className="text-sw-label-md text-sw-gray-50">{title}</span>
      <span className="truncate text-sw-label-sm text-sw-gray-300">
        {detail}
      </span>
    </span>
  </button>
);

type Launch = { tabId: number; account?: string };

const Deposit = ({ launch }: { launch?: Launch }) => {
  const runtime = useAppsRuntime()!;
  const { exec, account, isOutcomeDismissed, dismissOutcome, setPayer } =
    runtime;

  const { back, push, popTo } = useNavigation();
  const { ctx } = useUnsafeSnapshot();
  const { tokens } = useTokens();
  const { onChangeAmount, onChangeToken } = useTokenInputPair();
  const assets = useAccountAssets();
  const { source, select } = useTransferSource();
  const { secondaries: allSecondaries } = useAccounts();
  const pmAccount = usePolymarketAccount(account, launch);
  const balance = usePolymarketBalance(pmAccount.address, exec.phase);
  const intermediary = useIntermediaryBalances(exec.phase);
  const history = useAppExecutions();

  // Intents Connect refunds to the signing account's address on the origin
  // chain, so a deposit must start on the account's own networks: only
  // secondary wallets of the same family can pay.
  const secondaries = allSecondaries.filter(
    (wallet) => wallet.family === account.family,
  );

  // The account's wallet, one of its secondary wallets (by id), or a QR code.
  const [payWith, setPayWith] = useState<string>('wallet');
  // The secondary wallet shown in its row, kept when another option is picked.
  const [chosenSecondaryId, setChosenSecondaryId] = useState<string>();
  const [isPickingPayer, setIsPickingPayer] = useState(false);
  const [dismissedCancel, setDismissedCancel] = useState<string>();
  const [isPicking, setIsPicking] = useState(false);
  const [submitted, setSubmitted] = useState<Submitted>();
  const [dismissedError, setDismissedError] = useState<Error>();

  const depositViaWallet = payWith !== 'qr';
  const payerSecondary = secondaries.find((wallet) => wallet.id === payWith);
  // The wallet that sends the deposit (the account always signs).
  const payer = payerSecondary ?? account;

  const needsToken = useRef(false);

  // The widget's balances and token list follow the paying wallet.
  const choosePayWith = (next: string) => {
    setPayWith(next);
    const secondary = secondaries.find((wallet) => wallet.id === next);

    select(
      secondary ? { kind: 'secondary', id: secondary.id } : { kind: 'primary' },
    );

    // That wallet's own largest holding, once its balances are in.
    if (next !== 'qr') {
      needsToken.current = true;
    }
  };

  // The accordion animates to a fixed height: its content's, measured.
  const helperRef = useRef<HTMLDivElement>(null);
  const [helperHeight, setHelperHeight] = useState(120);

  useEffect(() => {
    const node = helperRef.current;

    if (!node) {
      return;
    }

    const observer = new ResizeObserver(() =>
      setHelperHeight(node.offsetHeight),
    );

    observer.observe(node);

    return () => observer.disconnect();
  });

  // Paying starts from the account's own wallet: the widget's balances must
  // be its. The previous choice comes back on leaving.
  const previousSource = useRef<TransferSource>(source);

  useEffect(() => {
    if (source.kind === 'secondary') {
      select({ kind: 'primary' });
    }

    const restore = previousSource.current;

    return () => {
      setPayer(null);
      select(restore);
    };
  }, []);

  // After switching the paying wallet: its largest holding.
  useEffect(() => {
    if (!needsToken.current || assets.isLoading) {
      return;
    }

    const isPayerSource = payerSecondary
      ? source.kind === 'secondary' && source.id === payerSecondary.id
      : source.kind === 'primary';

    if (!isPayerSource) {
      return;
    }

    // Only a token the paying wallet can send: right after the switch the
    // list may still hold the previous wallet's balances.
    const largest = assets.wallet.find(
      (asset) => familyOf(asset.token) === payer.family,
    )?.token;

    if (largest) {
      needsToken.current = false;
      fireEvent('tokenSelect', { variant: 'source', token: largest });
    }
  }, [assets.isLoading, assets.wallet, source, payerSecondary]);

  // A clean form on the wallet's largest holding, as Swap and Send start.
  const isPrimaryReady = source.kind === 'primary' && !assets.isLoading;
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!isPrimaryReady || hasStarted.current) {
      return;
    }

    hasStarted.current = true;
    fireEvent('reset', { clearWalletAddress: false });
    fireEvent('addressSet', null);

    const largest = assets.wallet[0]?.token;

    if (largest) {
      fireEvent('tokenSelect', { variant: 'source', token: largest });
    }
  }, [isPrimaryReady]);

  useStoreSideEffects({
    listenTo: ['updateBalances', 'setSourceTokenBalance'],
  });

  const deposit = useDeposit({
    exec,
    token: ctx.sourceToken,
    amount: ctx.sourceTokenAmount,
    account: pmAccount.address,
    depositViaWallet,
  });

  const isOffNetwork =
    !!ctx.sourceToken && familyOf(ctx.sourceToken) !== account.family;

  const preview = usePreview({
    exec,
    token: isOffNetwork ? undefined : ctx.sourceToken,
    amount: ctx.sourceTokenAmount,
    account: pmAccount.address,
    isAccountValid: pmAccount.isValid,
    depositViaWallet,
  });

  useCloseConnectorWhenIdle({
    account,
    exec,
    depositViaWallet: submitted?.depositViaWallet ?? false,
    isRetryingTransfer: deposit.state === 'FAILED',
  });

  // Re-attach to a deposit still running from an earlier session — past
  // the signature, so following it prompts nothing. Never with the wallet
  // transfer: it may already have been sent.
  const reattached = useRef(false);

  useEffect(() => {
    if (reattached.current || exec.phase !== 'idle' || exec.executionId) {
      return;
    }

    const running = history.executions.find(
      (execution) =>
        isInFlight(execution) &&
        execution.status !== 'CREATED' &&
        execution.metadata?.intent === POLYMARKET.intent,
    );

    if (!running) {
      return;
    }

    reattached.current = true;

    const token = tokens.find(
      (item) => !item.isIntent && item.assetId === running.quote.originAsset,
    );

    exec
      .resume(running.id, {
        depositViaWallet: false,
        originToken: token
          ? { decimals: token.decimals, contractAddress: token.contractAddress }
          : undefined,
      })
      .catch(() => undefined);
  }, [history.executions, exec.phase, exec.executionId]);

  const { execution } = exec;

  // What the deposit spends: as submitted, or (re-attached) as created.
  const sent = (() => {
    if (submitted) {
      return submitted;
    }

    const token = tokens.find(
      (item) => !item.isIntent && item.assetId === execution?.quote.originAsset,
    );

    return token && execution
      ? {
          token,
          amount: execution.quote.amount,
          depositViaWallet: false,
          startedAt: new Date(execution.createdAt ?? Date.now()).getTime(),
        }
      : undefined;
  })();

  const received = usd6(execution?.quote.minAmountOut);
  const fee = usd6(exec.networkFee ?? execution?.details.networkFee);
  const sentLabel = sent
    ? `${formatTokenAmount(sent.amount, sent.token)} ${sent.token.symbol} on ${chainLabel(sent.token.blockchain)}`
    : '';

  const secondsLeft = useSecondsLeft(exec.deadline);

  const startDeposit = async () => {
    if (!ctx.sourceToken) {
      return;
    }

    setSubmitted({
      token: ctx.sourceToken,
      amount: ctx.sourceTokenAmount,
      depositViaWallet,
      payerName: payer.name,
      startedAt: Date.now(),
    });
    // Read by the account's connector when the runner sends the deposit.
    setPayer(payerSecondary ?? null);
    await deposit.deposit();
  };

  const view = (() => {
    if (exec.recovery?.kind === 'resume-or-cancel') {
      return 'in-flight';
    }

    if (exec.recovery?.kind === 'retry-transfer') {
      return 'form';
    }

    switch (exec.phase) {
      case 'resolving-identity':
      case 'planning':
      case 'creating':
        return 'preparing';
      case 'awaiting-signature':
      case 'submitting':
        return 'signing';
      case 'awaiting-deposit':
        return sent?.depositViaWallet ? 'sending' : 'external';
      case 'expired':
        return 'external';
      case 'settling':
        return 'settling';
      case 'failed':
        // Declining in the wallet isn't a failure: back to the form, with a
        // note there.
        return isOutcomeDismissed || (exec.error && isDeclined(exec.error))
          ? 'form'
          : 'failed';
      case 'success':
        return isOutcomeDismissed ? 'form' : 'success';
      default:
        return 'form';
    }
  })();

  const cancelButton = exec.executionId ? (
    <Button
      variant="outlined"
      size="lg"
      state={exec.isCancelling ? 'loading' : 'default'}
      onClick={() => {
        exec.cancel(exec.executionId).catch(() => undefined);
      }}>
      {exec.isCancelling ? 'Sign to cancel' : 'Cancel'}
    </Button>
  ) : null;

  const destinationNote = (
    <Notes.Item
      label="To"
      value={`Polymarket ${shortAddress(pmAccount.address)}`}
    />
  );

  const progressNotes = (
    <NotesCard>
      <Notes.Item label="You send" value={sentLabel} />
      <Notes.Item
        label="You receive"
        value={received ? `≈ ${received} pUSD` : undefined}
      />
      {destinationNote}
    </NotesCard>
  );

  const bridgeLabel = `Bridge ${sent?.token.symbol ?? 'funds'} to Polygon`;
  const sentPayer = submitted?.payerName ?? account.name;

  if (view === 'preparing' || view === 'signing' || view === 'sending') {
    const active = view === 'preparing' ? 0 : 1;
    const labels = [
      received ? `Quote ready · ≈ ${received} pUSD` : 'Preparing the quote',
      view === 'sending'
        ? `Confirm the transfer in ${sentPayer}`
        : `Approve with ${account.name}`,
      bridgeLabel,
      'Swap to pUSD and credit your account',
    ];

    return (
      <Screen
        title={TITLE}
        onBack={back}
        footer={
          <>
            <Button variant="primary" size="lg" state="loading">
              {view === 'sending' ? 'Awaiting transfer' : 'Awaiting signature'}
            </Button>
            {cancelButton}
          </>
        }>
        <StatusHero
          tone="pending"
          title={(() => {
            if (view === 'preparing') {
              return 'Preparing your deposit';
            }

            return view === 'sending'
              ? `Confirm in ${sentPayer}`
              : `Approve in ${account.name}`;
          })()}
          description={
            view === 'sending'
              ? `Confirm the transfer of ${sentLabel} in ${sentPayer}.`
              : 'Confirm the wallet prompt to sign this deposit. Nothing moves until you approve. Declining asks for one more signature to release it.'
          }
        />
        <DepositSteps
          steps={stepStates(labels, view === 'sending' ? 1 : active + 1).map(
            (step, index) =>
              view === 'preparing' && index === 0
                ? { ...step, state: 'active' }
                : step,
          )}
        />
        {progressNotes}
      </Screen>
    );
  }

  if (view === 'external' && exec.depositAddress) {
    const isExpired = exec.phase === 'expired' || secondsLeft === 0;

    return (
      <Screen
        title={TITLE}
        onBack={back}
        footer={
          exec.executionId ? (
            <Button
              variant="outlined"
              size="lg"
              state={exec.isCancelling ? 'loading' : 'default'}
              onClick={() => {
                exec.cancel(exec.executionId).catch(() => undefined);
              }}>
              {exec.isCancelling ? 'Sign to cancel' : 'Cancel deposit'}
            </Button>
          ) : null
        }>
        <div className="flex flex-col items-center gap-sw-md text-center">
          <h2 className="m-0 text-sw-h5 text-sw-gray-50">Send {sentLabel}</h2>
          <p className="m-0 text-sw-body-md text-sw-gray-200">
            From any wallet or exchange, to this one-time address.
          </p>
        </div>
        <QrCode value={exec.depositAddress} />
        <div className="flex shrink-0 items-center gap-sw-md rounded-sw-lg bg-sw-gray-900 p-sw-lg">
          <div className="flex min-w-[0px] grow flex-col gap-sw-xs">
            <span className="text-sw-label-sm text-sw-gray-300">
              Deposit address
              {sent ? ` · ${chainLabel(sent.token.blockchain)}` : ''}
            </span>
            <span className="break-all text-sw-label-sm text-sw-gray-50">
              {exec.depositAddress}
            </span>
          </div>
          <CopyButton value={exec.depositAddress} />
        </div>
        <div className="flex flex-col gap-sw-xs px-sw-xs">
          <span className="flex items-center gap-sw-sm text-sw-label-sm text-sw-gray-100">
            <span className="block h-[8px] w-[8px] rounded-full bg-sw-accent-500" />
            {isExpired
              ? 'Expired · a late deposit still completes'
              : `Waiting for deposit${secondsLeft !== null ? ` · expires in ${mmss(secondsLeft)}` : ''}`}
          </span>
          <span className="text-sw-body-sm text-sw-gray-400">
            Keep the panel open or come back later — it’s tracked in Activity.
          </span>
        </div>
        <Banner
          className="wrap-banner"
          variant="warn"
          hasBg
          multiline
          message={`Send exactly ${sentLabel || 'the amount above'}. Other tokens or networks can’t be processed.`}
        />
      </Screen>
    );
  }

  if (view === 'settling') {
    const active = (() => {
      switch (exec.status) {
        case 'OPERATION_PENDING':
          return 2;
        case 'OPERATION_PROCESSING':
          return 3;
        default:
          return 1;
      }
    })();

    return (
      <Screen
        title={TITLE}
        onBack={back}
        footer={
          <Button
            variant="outlined"
            size="lg"
            onClick={() => push({ name: 'activity', filter: 'apps' })}>
            View in activity
          </Button>
        }>
        <StatusHero
          tone="pending"
          title="Depositing to Polymarket"
          description={`${exec.status ? STATUS_COPIES[exec.status] : 'On the way…'} You can close the panel — it keeps going.`}
        />
        <DepositSteps
          steps={stepStates(
            [
              `Signed with ${account.name}`,
              'Deposit received',
              bridgeLabel,
              'Swap to pUSD and credit your account',
            ],
            active,
          )}
        />
        {progressNotes}
      </Screen>
    );
  }

  if (view === 'success') {
    const seconds = sent
      ? Math.round((Date.now() - sent.startedAt) / 1000)
      : null;

    return (
      <Screen
        title={TITLE}
        onBack={() => {
          dismissOutcome();
          back();
        }}
        footer={
          <>
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                void chrome.tabs.create({ url: POLYMARKET.homeUrl });
              }}>
              Open Polymarket
            </Button>
            <Button
              variant="outlined"
              size="lg"
              onClick={() => {
                dismissOutcome();
                popTo('apps');
              }}>
              Done
            </Button>
          </>
        }>
        <StatusHero
          tone="success"
          title={received ? `Deposited ≈ ${received} pUSD` : 'Deposited'}
          description={
            balance.data === undefined
              ? 'It’s in your Polymarket account.'
              : `Your Polymarket account balance is now ${usd6(balance.data, PUSD_DECIMALS)} pUSD.`
          }
        />
        <NotesCard>
          <Notes.Item label="You sent" value={sentLabel} />
          <Notes.Item label="Fees" value={fee ? `${fee} USDC` : undefined} />
          <Notes.Item label="Account" value={shortAddress(pmAccount.address)} />
          {seconds !== null ? (
            <Notes.Item label="Time" value={`${seconds} sec`} />
          ) : null}
        </NotesCard>
      </Screen>
    );
  }

  if (view === 'failed') {
    const held = intermediary.data?.usdc ?? '0';
    const isHeld = BigInt(held) > 0n;

    return (
      <Screen
        title={TITLE}
        onBack={() => {
          dismissOutcome();
          back();
        }}
        footer={
          <>
            <Button variant="primary" size="lg" onClick={dismissOutcome}>
              Try again
            </Button>
            <Button
              variant="outlined"
              size="lg"
              onClick={() => {
                dismissOutcome();
                popTo('home');
              }}>
              Back to wallet
            </Button>
          </>
        }>
        <StatusHero
          tone="error"
          title="Deposit failed"
          description={
            isHeld
              ? `The ${usd6(held)} USDC that reached Polygon is safe in your Intents Connect account.`
              : ((exec.error &&
                  friendlyError(exec.error, { account, token: sent?.token })) ??
                'The deposit couldn’t be completed.')
          }
        />
        <NotesCard>
          <Notes.Item
            label="Status"
            value={exec.status ? STATUS_COPIES[exec.status] : 'Failed'}
          />
          {isHeld && intermediary.data ? (
            <>
              <Notes.Item
                label="Held in"
                value={`${shortAddress(intermediary.data.address)} on Polygon`}
              />
              <Notes.Item label="Amount" value={`${usd6(held)} USDC`} />
            </>
          ) : null}
        </NotesCard>
      </Screen>
    );
  }

  if (view === 'in-flight' && deposit.state === 'IN_FLIGHT') {
    // Intents Connect runs one execution per wallet at a time: the blocking
    // one may be this app's or another app's.
    const blocking = history.executions.find((item) => item.id === deposit.id);

    const blockingApp = findIntegrationByIntent(blocking?.metadata?.intent);
    const isOwn = blockingApp?.id === POLYMARKET.id;

    return (
      <Screen
        title={TITLE}
        onBack={back}
        footer={
          <>
            {isOwn ? (
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  exec
                    .resume(deposit.id, { depositViaWallet: false })
                    .catch(() => undefined);
                }}>
                Resume deposit
              </Button>
            ) : null}
            {isOwn ? (
              <Button
                variant="outlined"
                size="lg"
                state={exec.isCancelling ? 'loading' : 'default'}
                onClick={() => {
                  exec.cancel(deposit.id).catch(() => undefined);
                }}>
                {exec.isCancelling ? 'Sign to cancel' : 'Cancel it'}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                state={exec.isCancelling ? 'loading' : 'default'}
                onClick={() => {
                  exec.cancel(deposit.id).catch(() => undefined);
                }}>
                {exec.isCancelling ? 'Sign to cancel' : 'Cancel it'}
              </Button>
            )}
          </>
        }>
        <StatusHero
          tone="pending"
          title={
            isOwn
              ? 'A deposit is already in progress'
              : 'Another deposit is in progress'
          }
          description={
            isOwn
              ? `${account.name} has a Polymarket deposit that hasn’t finished. Resume it to follow it here, or cancel it (one signature) to start a new one.`
              : `${account.name} has an unfinished Intents Connect deposit${blocking?.metadata?.title ? ` (${String(blocking.metadata.title)})` : ' from another app'}. Only one runs per wallet at a time: cancel it (one signature) to deposit here.`
          }
        />
        {blocking ? (
          <NotesCard>
            <Notes.Item label="Status" value={STATUS_COPIES[blocking.status]} />
            {blocking.createdAt ? (
              <Notes.Item
                label="Created"
                value={new Date(blocking.createdAt).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              />
            ) : null}
            <Notes.Item label="Execution" value={shortAddress(blocking.id)} />
          </NotesCard>
        ) : null}
      </Screen>
    );
  }

  if (isPicking) {
    return (
      <TokenPicker
        variant="source"
        chainsFilter={{
          intents: 'none',
          external: depositViaWallet ? 'with-balance' : 'all',
        }}
        onSelect={(token) => {
          onChangeToken('source', token);
          setIsPicking(false);
        }}
        onClose={() => setIsPicking(false)}
      />
    );
  }

  const token = ctx.sourceToken;
  // Off the account's networks nothing can be refunded to it (see above).
  const cannotSend =
    !!token && (isOffNetwork || familyOf(token) !== payer.family);

  const isInsufficient =
    depositViaWallet &&
    !!ctx.sourceTokenBalance &&
    isNotEmptyAmount(ctx.sourceTokenAmount) &&
    BigInt(ctx.sourceTokenAmount) > BigInt(ctx.sourceTokenBalance);

  const canDeposit =
    pmAccount.isValid &&
    !!token &&
    isNotEmptyAmount(ctx.sourceTokenAmount) &&
    !cannotSend &&
    !isInsufficient &&
    !deposit.isBusy;

  const lastError = deposit.preparationError ?? exec.error;
  // A cancelled deposit gets its own note, not an error.
  const cancelKey = `${exec.executionId ?? 'none'}:${exec.phase}:${lastError?.message ?? ''}`;
  const wasCancelled =
    exec.phase === 'cancelled' || (!!lastError && isStopped(lastError));

  const visibleError =
    !deposit.isBusy && lastError && !isStopped(lastError)
      ? lastError
      : undefined;

  const footer = (() => {
    if (deposit.state === 'FAILED') {
      return (
        <>
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              exec.retryDeposit().catch(() => undefined);
            }}>
            Retry deposit
          </Button>
          {cancelButton}
        </>
      );
    }

    if (!pmAccount.isValid) {
      return (
        <Button variant="primary" size="lg" state="disabled">
          Add your Polymarket account first
        </Button>
      );
    }

    return (
      <Button
        variant="primary"
        size="lg"
        state={canDeposit ? 'default' : 'disabled'}
        onClick={() => {
          void startDeposit();
        }}>
        {depositViaWallet ? 'Deposit to Polymarket' : 'Get deposit address'}
      </Button>
    );
  })();

  const walletBalance =
    token && ctx.sourceTokenBalance
      ? `${formatTokenAmount(ctx.sourceTokenBalance, token) || '0'} ${token.symbol} on ${chainLabel(token.blockchain)}`
      : 'Tokens in this wallet';

  const helper = intermediary.data;

  // The secondary wallets as picker rows; the row shows the chosen one.
  const secondaryOptions = sourceOptions(account, secondaries).filter(
    (option) => option.source.kind === 'secondary',
  );

  const shownSecondaryOption =
    secondaryOptions.find(
      (option) =>
        option.source.kind === 'secondary' &&
        option.source.id === (payerSecondary?.id ?? chosenSecondaryId),
    ) ?? secondaryOptions[0];

  return (
    <Screen title={TITLE} onBack={back} footer={footer}>
      <PolymarketAccountCard
        account={pmAccount}
        balance={balance.data}
        isLocked={deposit.isBusy}
      />

      <div className="shrink-0">
        <TokenInput.Source
          heading="You send"
          state={(() => {
            if (deposit.isBusy) {
              return 'disabled';
            }

            return isInsufficient ? 'error-balance' : 'default';
          })()}
          onMsg={(msg) => {
            switch (msg.type) {
              case 'on_change_amount':
                onChangeAmount('source', msg.amount);
                break;
              case 'on_select_token':
                onChangeToken('source', msg.token);
                break;
              default:
                setIsPicking(true);
            }
          }}
        />
      </div>

      <div className="flex shrink-0 flex-col gap-sw-md">
        <span className="px-sw-xs text-sw-label-sm text-sw-gray-200">
          Pay with
        </span>
        <div
          role="radiogroup"
          aria-label="Pay with"
          className="grid grid-cols-2 gap-sw-md">
          <PayWithTile
            icon="browser"
            title={account.name}
            detail={payWith === 'wallet' ? walletBalance : 'Your wallet'}
            isSelected={payWith === 'wallet'}
            isDisabled={deposit.isBusy}
            onSelect={() => choosePayWith('wallet')}
          />
          <PayWithTile
            icon="qr"
            title="Another wallet"
            detail="Send via QR code"
            isSelected={payWith === 'qr'}
            isDisabled={deposit.isBusy}
            onSelect={() => choosePayWith('qr')}
          />
          {shownSecondaryOption ? (
            <button
              type="button"
              role="radio"
              aria-checked={!!payerSecondary}
              aria-label={`Pay from ${shownSecondaryOption.name}`}
              disabled={deposit.isBusy}
              onClick={() => setIsPickingPayer(true)}
              className={cn(
                'col-span-2 flex w-full items-center gap-sw-md rounded-sw-md px-sw-lg py-sw-md text-left transition-colors disabled:opacity-60',
                payerSecondary
                  ? 'bg-sw-gray-800 shadow-[inset_0_0_0_1px_var(--c-sw-accent-300)]'
                  : 'bg-sw-gray-900 hover:bg-sw-gray-800',
              )}>
              {shownSecondaryOption.icon(24)}
              <span className="flex min-w-[0px] grow items-baseline gap-sw-sm">
                <span className="truncate text-sw-label-md text-sw-gray-50">
                  {shownSecondaryOption.name}
                </span>
                {shownSecondaryOption.address ? (
                  <span className="shrink-0 text-sw-label-sm text-sw-gray-400">
                    {shortAddress(shownSecondaryOption.address)}
                  </span>
                ) : null}
              </span>
              <Radio isSelected={!!payerSecondary} />
            </button>
          ) : null}
        </div>
      </div>

      {!depositViaWallet ? (
        <p className="m-0 px-sw-xs text-sw-body-sm text-sw-gray-300">
          Approve once in {account.name}, then a one-time address and QR code
          appear here. Send{' '}
          {token
            ? `exactly that ${token.symbol} on ${chainLabel(token.blockchain)}`
            : 'the amount'}{' '}
          from any wallet or exchange.
        </p>
      ) : null}

      {cannotSend && token ? (
        <Banner
          className="wrap-banner"
          variant="info"
          hasBg
          multiline
          message={
            isOffNetwork
              ? `Deposits from ${account.name} start on ${FAMILY_NETWORKS[account.family]}, where refunds go back to it. Pick a token there.`
              : `${payer.name} can’t send ${token.symbol} on ${token.chainName}. Pick a token on its own network, or pay from another wallet.`
          }
        />
      ) : null}

      {pmAccount.isValid && token && isNotEmptyAmount(ctx.sourceTokenAmount) ? (
        <NotesCard>
          <Notes.Item
            label="You receive"
            isLoading={preview.isLoading}
            value={
              preview.preview
                ? `≈ ${usd6(preview.preview.quote.minAmountOut)} pUSD`
                : undefined
            }
          />
          <Notes.Item
            label="Route"
            value={`${token.symbol} ${chainLabel(token.blockchain)} → Polygon → pUSD`}
          />
          <Notes.Item
            label="Fees"
            isLoading={preview.isLoading}
            value={
              preview.preview?.details.networkFee
                ? `${usd6(preview.preview.details.networkFee)} USDC`
                : undefined
            }
          />
          {preview.preview?.details.estimatedTime ? (
            <Notes.Item
              label="Estimated time"
              value={`~ ${preview.preview.details.estimatedTime} sec`}
            />
          ) : null}
        </NotesCard>
      ) : null}

      {preview.error && !visibleError ? (
        <Banner
          className="wrap-banner"
          variant="error"
          hasBg
          multiline
          message={friendlyError(preview.error, {
            account,
            token: ctx.sourceToken,
          })}
        />
      ) : null}

      {visibleError && visibleError !== dismissedError ? (
        <Banner
          className="wrap-banner"
          variant={isDeclined(visibleError) ? 'warn' : 'error'}
          hasBg
          multiline
          message={friendlyError(visibleError, {
            account,
            token: sent?.token ?? ctx.sourceToken,
          })}
          onDismiss={() => setDismissedError(visibleError)}
        />
      ) : null}

      {wasCancelled && !deposit.isBusy && dismissedCancel !== cancelKey ? (
        <Banner
          className="wrap-banner"
          variant="info"
          hasBg
          multiline
          message="The deposit was cancelled. Nothing was sent."
          onDismiss={() => setDismissedCancel(cancelKey)}
        />
      ) : null}

      <Accordion
        className="shrink-0"
        title="Intents Connect account"
        badge={helper ? `${usd6(helper.usdc)} USDC` : undefined}
        isBadgeLoading={intermediary.isLoading}
        // The widget's 16px spacer above the content, plus the content.
        expandedHeightPx={16 + helperHeight}>
        <div
          ref={helperRef}
          className="flex flex-col gap-sw-md px-sw-md pb-sw-xs">
          <Notes>
            <Notes.Item
              label="Address"
              value={
                helper
                  ? `${shortAddress(helper.address)} on Polygon`
                  : undefined
              }
            />
            <Notes.Item
              label="Holds"
              value={
                helper
                  ? `${usd6(helper.usdc)} USDC · ${usd6(helper.pusd, PUSD_DECIMALS)} pUSD`
                  : undefined
              }
            />
          </Notes>
        </div>
      </Accordion>

      {payerSecondary ? (
        <p className="m-0 px-sw-xs text-sw-body-sm text-sw-gray-300">
          Approve in {account.name}, then {payerSecondary.name} sends the funds.
          Refunds, if any, go back to {account.name}.
        </p>
      ) : null}
      {isPickingPayer ? (
        <WalletPicker
          title="Pay from wallet"
          description="Your secondary wallets. Your account approves; the wallet sends the funds."
          options={secondaryOptions}
          selectedId={shownSecondaryOption?.id}
          onSelect={(option) => {
            setIsPickingPayer(false);

            if (option.source.kind === 'secondary') {
              setChosenSecondaryId(option.source.id);
              choosePayWith(option.source.id);
            }
          }}
          onClose={() => setIsPickingPayer(false)}
        />
      ) : null}
    </Screen>
  );
};

/** Top up a Polymarket account from the account's wallet, or any wallet. */
export const PolymarketScreen = ({ launch }: { launch?: Launch }) => {
  const runtime = useAppsRuntime();
  const { back } = useNavigation();

  if (!runtime) {
    return (
      <Screen title={TITLE} onBack={back}>
        <Banner
          className="wrap-banner"
          variant="info"
          hasBg
          multiline
          message="Apps need a wallet account Intents Connect can sign with."
        />
      </Screen>
    );
  }

  return <Deposit launch={launch} />;
};
