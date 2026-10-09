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

import type { WalletAccount } from '../../accounts/types';
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
import { describeServiceError } from '../../apps/serviceErrors';
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

const describeError = (error: Error, account: WalletAccount) => {
  const described = describeServiceError(error, account);

  // A bare fetch TypeError says nothing the message doesn't.
  if (described.cause instanceof TypeError) {
    return described.message;
  }

  const cause =
    described.cause instanceof Error ? described.cause.message : undefined;

  return `${described.message}${cause ? ` — ${cause}` : ''}`;
};

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
  startedAt: number;
};

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
      <span
        className={cn(
          'block h-[16px] w-[16px] rounded-full',
          isSelected
            ? 'shadow-[inset_0_0_0_5px_var(--c-sw-accent-300)]'
            : 'shadow-[inset_0_0_0_2px_var(--c-sw-gray-600)]',
        )}
      />
    </span>
    <span className="flex flex-col gap-sw-xxs">
      <span className="text-sw-label-md text-sw-gray-50">{title}</span>
      <span className="truncate text-sw-label-sm text-sw-gray-300">
        {detail}
      </span>
    </span>
  </button>
);

const Deposit = () => {
  const runtime = useAppsRuntime()!;
  const { exec, account } = runtime;
  const { back, push, popTo } = useNavigation();
  const { ctx } = useUnsafeSnapshot();
  const { tokens } = useTokens();
  const { onChangeAmount, onChangeToken } = useTokenInputPair();
  const assets = useAccountAssets();
  const { source, select } = useTransferSource();
  const pmAccount = usePolymarketAccount(account);
  const balance = usePolymarketBalance(pmAccount.address, exec.phase);
  const intermediary = useIntermediaryBalances(exec.phase);
  const history = useAppExecutions();

  const [payWith, setPayWith] = useState<'wallet' | 'qr'>('wallet');
  const [isPicking, setIsPicking] = useState(false);
  const [submitted, setSubmitted] = useState<Submitted>();
  // A terminal result the user moved on from: back to the form.
  const [acknowledged, setAcknowledged] = useState<string>();
  const [dismissedError, setDismissedError] = useState<Error>();

  const depositViaWallet = payWith === 'wallet';

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

  // Apps spend the account's own wallet: the widget's balances must be its.
  const previousSource = useRef<TransferSource>(source);

  useEffect(() => {
    if (source.kind === 'secondary') {
      select({ kind: 'primary' });
    }

    const restore = previousSource.current;

    return () => {
      if (restore.kind === 'secondary') {
        select(restore);
      }
    };
  }, []);

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

  const preview = usePreview({
    exec,
    token: ctx.sourceToken,
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
      startedAt: Date.now(),
    });
    setAcknowledged(undefined);
    await deposit.deposit();
  };

  const terminalKey = `${exec.executionId ?? 'none'}:${exec.phase}`;

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
      case 'success':
      case 'failed':
        return acknowledged === terminalKey ? 'form' : exec.phase;
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

  if (view === 'preparing' || view === 'signing' || view === 'sending') {
    const active = view === 'preparing' ? 0 : 1;
    const labels = [
      received ? `Quote ready · ≈ ${received} pUSD` : 'Preparing the quote',
      view === 'sending'
        ? `Confirm the transfer in ${account.name}`
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
          title={
            view === 'preparing'
              ? 'Preparing your deposit'
              : `Approve in ${account.name}`
          }
          description={
            view === 'sending'
              ? `Confirm the transfer of ${sentLabel} in ${account.name}.`
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
        onBack={() => setAcknowledged(terminalKey)}
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
            <Button variant="outlined" size="lg" onClick={() => popTo('apps')}>
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
        onBack={() => setAcknowledged(terminalKey)}
        footer={
          <>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setAcknowledged(terminalKey)}>
              Try again
            </Button>
            <Button variant="outlined" size="lg" onClick={() => popTo('home')}>
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
              : ((exec.error && describeError(exec.error, account)) ??
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
  const cannotSend =
    depositViaWallet && !!token && familyOf(token) !== account.family;

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

  const visibleError = !deposit.isBusy
    ? (deposit.preparationError ?? exec.error)
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
        Deposit to Polymarket
      </Button>
    );
  })();

  const walletBalance =
    token && ctx.sourceTokenBalance
      ? `${formatTokenAmount(ctx.sourceTokenBalance, token) || '0'} ${token.symbol} on ${chainLabel(token.blockchain)}`
      : 'Tokens in this wallet';

  const helper = intermediary.data;

  return (
    <Screen title={TITLE} onBack={back} footer={footer}>
      <PolymarketAccountCard
        account={pmAccount}
        balance={balance.data}
        isLocked={deposit.isBusy}
      />

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

      <div className="flex shrink-0 flex-col gap-sw-md">
        <span className="px-sw-xs text-sw-label-sm text-sw-gray-200">
          Pay with
        </span>
        <div role="radiogroup" aria-label="Pay with" className="flex gap-sw-md">
          <PayWithTile
            icon="browser"
            title={account.name}
            detail={walletBalance}
            isSelected={payWith === 'wallet'}
            isDisabled={deposit.isBusy}
            onSelect={() => setPayWith('wallet')}
          />
          <PayWithTile
            icon="qr"
            title="Another wallet"
            detail="Send via QR code"
            isSelected={payWith === 'qr'}
            isDisabled={deposit.isBusy}
            onSelect={() => setPayWith('qr')}
          />
        </div>
      </div>

      {cannotSend && token ? (
        <Banner
          variant="info"
          hasBg
          multiline
          message={`${account.name} can’t send ${token.symbol} on ${token.chainName}. Pick a token on its own network, or pay from another wallet.`}
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
          variant="error"
          hasBg
          multiline
          message={describeError(preview.error, account)}
        />
      ) : null}

      {visibleError && visibleError !== dismissedError ? (
        <Banner
          variant="error"
          hasBg
          multiline
          message={describeError(visibleError, account)}
          onDismiss={() => setDismissedError(visibleError)}
        />
      ) : null}

      {exec.phase === 'cancelled' ? (
        <Banner
          variant="info"
          hasBg
          multiline
          message="The deposit was cancelled. Nothing was sent."
        />
      ) : null}

      <Accordion
        title="Intents Connect account"
        badge={helper ? `${usd6(helper.usdc)} USDC` : undefined}
        isBadgeLoading={intermediary.isLoading}
        // The widget's 16px spacer above the content, plus the content.
        expandedHeightPx={16 + helperHeight}>
        <div
          ref={helperRef}
          className="flex flex-col gap-sw-md px-sw-md pb-sw-xs">
          <p className="m-0 text-sw-body-sm text-sw-gray-300">
            A helper account on Polygon that belongs to you. It runs the deposit
            and is usually empty between deposits.
          </p>
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
    </Screen>
  );
};

/** Top up a Polymarket account from the account's wallet, or any wallet. */
export const PolymarketScreen = () => {
  const runtime = useAppsRuntime();
  const { back } = useNavigation();

  if (!runtime) {
    return (
      <Screen title={TITLE} onBack={back}>
        <Banner
          variant="info"
          hasBg
          multiline
          message="Apps need a wallet account Intents Connect can sign with."
        />
      </Screen>
    );
  }

  return <Deposit />;
};
