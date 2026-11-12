/**
 * Example: Intents Connect on a site whose visitor already has a wallet
 * connected (EVM, Solana or NEAR).
 *
 * 1. Detects the wallet the site is already connected to — no connect modal.
 * 2. Asks the user to verify it (one signature, simulated on intents.near).
 * 3. Logs the wallet's on-chain balances and its intents balances.
 * 4. Supplies USDC to Aave on Monad via Intents Connect: any token the wallet
 *    holds is bridged to Monad USDC, then the intermediary runs
 *    approve + supply. Same steps as `../aave/constants.ts`.
 *
 * Mount it anywhere: `<AaveAccountExample />`. Headless apart from a few
 * plain elements — style or replace them freely.
 *
 * Components are declared before use, so the steps read bottom-up: the entry
 * point (step 1) is at the end of the file.
 */
/* eslint-disable no-console -- logging balances is what this example shows */
import { useEffect, useMemo, useState } from 'react';

import {
  type BalanceToken,
  createIntentsApi,
  createIntentsConnectApi,
  EVM_CHAIN_IDS,
  type ExecutionPlan,
  NATIVE_NEAR_ASSET_ID,
  type Recipe,
  type Step,
  type WalletConnector,
} from '@aurora-is-near/intents-connect';
import {
  IntentsConnectProvider,
  useIntentsAccount,
  useIntentsBalances,
  useIntentsConnectFlow,
  useWalletBalances,
  useWalletVerification,
} from '@aurora-is-near/intents-connect/react';
import {
  type DetectedWallet,
  pickConnectedWallet,
  type UnsupportedReason,
} from '@aurora-is-near/intents-connect-wallet/detect';
import { useDetectedWallets } from '@aurora-is-near/intents-connect-wallet/detect/react';
import { toEvmWalletConnector } from '@aurora-is-near/intents-connect-wallet/evm';
import { toNearWalletConnector } from '@aurora-is-near/intents-connect-wallet/near';
import { toSolanaWalletConnector } from '@aurora-is-near/intents-connect-wallet/solana';

// ---------------------------------------------------------------------------
// Config — replace with your own keys (https://studio.aurora.dev).
// ---------------------------------------------------------------------------

const API_KEY = '5a6c4f98-f174-4bd2-aa19-3d53e3abe87d';
const INTENTS_CONNECT_API_URL = 'https://intents-connect-alpha-api.aurora.dev';
/** Optional: faster wallet balances, and SPL tokens on Solana. */
const ALCHEMY_API_KEY: string | undefined = undefined;
/** Builds and submits Solana deposit transfers. */
const SOLANA_RPC_URL = 'https://solana-rpc.publicnode.com';

// Created once, outside React: both clients are stateless.
const connectApi = createIntentsConnectApi({
  baseUrl: INTENTS_CONNECT_API_URL,
  apiKey: API_KEY,
});

const intentsApi = createIntentsApi({ apiKey: API_KEY });

// ---------------------------------------------------------------------------
// Aave V3 on Monad — the steps the intermediary executes after the bridge.
// ---------------------------------------------------------------------------

const AAVE_POOL = '0x69a5F9AD4f96ebf0a0C792dD42a01cC5C0102fef';
const MONAD_USDC = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603';
const MONAD_USDC_ASSET =
  'nep245:v2_1.omni.hot.tg:143_2dmLwYWkCQKyTjeUPAsGJuiVLbFx';

type AaveParams = {
  /**
   * Who receives the aTokens. The demo uses the connected wallet, which only
   * works for EVM wallets; Solana and NEAR users name an EVM address instead.
   */
  onBehalfOf: string;
};

const aaveSupplyRecipe: Recipe<AaveParams> = {
  id: 'aave-monad-supply',
  intent: 'aave_monad_supply',
  title: 'Supply USDC to Aave on Monad',
  flow: 'bridge-in',
  type: 'evm',
  destination: {
    chain: 'monad',
    assetId: MONAD_USDC_ASSET,
    tokenAddress: MONAD_USDC,
  },
  // `amount` is opaque (it may be the {MIN_AMOUNT_OUT} placeholder): template
  // it, never inspect it.
  buildSteps: ({ amount }, { onBehalfOf }): Step[] => [
    {
      to: MONAD_USDC,
      functionSignature: 'approve(address,uint256)',
      parameters: [AAVE_POOL, amount],
      value: '0',
    },
    {
      to: AAVE_POOL,
      functionSignature: 'supply(address,uint256,address,uint16)',
      parameters: [MONAD_USDC, amount, onBehalfOf, '0'],
      value: '0',
    },
  ],
};

type DepositArgs = {
  token: BalanceToken;
  amountAtomic: string;
  onBehalfOf: string;
  /** false: show a deposit address instead of prompting the wallet. */
  depositViaWallet: boolean;
};

const buildAavePlan = ({
  token,
  amountAtomic,
  onBehalfOf,
  depositViaWallet,
}: DepositArgs): ExecutionPlan<AaveParams> => ({
  recipe: aaveSupplyRecipe,
  params: { onBehalfOf },
  quote: {
    originAsset: token.assetId,
    destinationAsset: MONAD_USDC_ASSET,
    amount: amountAtomic,
    swapType: 'EXACT_INPUT',
    slippageTolerance: 100, // 1%
    deadline: new Date(Date.now() + 15 * 60_000).toISOString(),
  },
  originChain: token.blockchain,
  originToken: {
    contractAddress: token.contractAddress,
    decimals: token.decimals,
  },
  originChainId: EVM_CHAIN_IDS[token.blockchain] ?? null,
  depositViaWallet,
});

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

const toAtomic = (value: string, decimals: number): string | undefined => {
  const match = /^(\d+)(?:\.(\d*))?$/.exec(value.trim());

  if (!match || (match[2]?.length ?? 0) > decimals) {
    return undefined;
  }

  const atomic = BigInt(
    `${match[1]}${(match[2] ?? '').padEnd(decimals, '0')}`,
  ).toString();

  return atomic === '0' ? undefined : atomic;
};

const fromAtomic = (value: string, decimals: number): string => {
  const padded = value.padStart(decimals + 1, '0');
  const whole = padded.slice(0, -decimals) || '0';
  const fraction = padded.slice(-decimals).replace(/0+$/, '');

  return decimals && fraction ? `${whole}.${fraction}` : whole;
};

/** A detected wallet as the WalletConnector Intents Connect runs with. */
const toConnector = (
  detected: DetectedWallet | undefined,
): {
  connector: WalletConnector | null;
  unsupportedReason?: UnsupportedReason;
} => {
  switch (detected?.family) {
    case 'evm':
      return toEvmWalletConnector(detected);
    case 'sol':
      return toSolanaWalletConnector(detected, { rpcUrl: SOLANA_RPC_URL });
    case 'near':
      return toNearWalletConnector(detected);
    default:
      return { connector: null, unsupportedReason: 'NOT_CONNECTED' };
  }
};

// ---------------------------------------------------------------------------
// 4. Aave deposit via Intents Connect
// ---------------------------------------------------------------------------

const AaveDeposit = () => {
  const { family, address } = useIntentsAccount();
  // Same provider-level store as Account's hook: no second fetch.
  const { balances, tokens } = useWalletBalances();

  // Tokens the wallet can pay with. Native NEAR is a synthetic id for the
  // balance view, not a 1Click asset — NEAR users pay with wNEAR et al.
  const sources = useMemo(
    () =>
      tokens.filter(
        (token) =>
          token.assetId !== NATIVE_NEAR_ASSET_ID &&
          BigInt(balances[token.assetId] ?? '0') > 0n,
      ),
    [tokens, balances],
  );

  const [assetId, setAssetId] = useState<string>();
  const [amount, setAmount] = useState('');
  const [onBehalfOf, setOnBehalfOf] = useState(
    family === 'evm' && address ? address : '',
  );

  const [depositViaWallet, setDepositViaWallet] = useState(true);

  const token =
    sources.find((source) => source.assetId === assetId) ?? sources[0];

  const amountAtomic = token ? toAtomic(amount, token.decimals) : undefined;
  const exceedsBalance =
    !!token &&
    !!amountAtomic &&
    BigInt(amountAtomic) > BigInt(balances[token.assetId] ?? '0');

  const flow = useIntentsConnectFlow<DepositArgs, AaveParams>({
    buildPlan: buildAavePlan,
    onEvent: (event) => console.log('[aave deposit]', event),
  });

  const { exec } = flow;

  useEffect(() => {
    if (exec.phase === 'success') {
      console.log('[aave deposit] supplied to Aave on Monad', exec.execution);
    }
  }, [exec.phase, exec.execution]);

  const canSubmit =
    !!token &&
    !!amountAtomic &&
    !exceedsBalance &&
    EVM_ADDRESS.test(onBehalfOf) &&
    !flow.isBusy &&
    flow.state === 'IDLE';

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        if (canSubmit) {
          void flow.submit({
            token,
            amountAtomic,
            onBehalfOf,
            depositViaWallet,
          });
        }
      }}>
      <h3>Supply USDC to Aave on Monad</h3>

      {sources.length === 0 ? (
        <p>No balance to deposit from this wallet yet.</p>
      ) : (
        <>
          <label>
            Pay with{' '}
            <select
              value={token?.assetId}
              onChange={(event) => setAssetId(event.target.value)}>
              {sources.map((source) => (
                <option key={source.assetId} value={source.assetId}>
                  {source.symbol} on {source.blockchain} —{' '}
                  {fromAtomic(balances[source.assetId] ?? '0', source.decimals)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Amount{' '}
            <input
              inputMode="decimal"
              value={amount}
              placeholder="0.0"
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          {exceedsBalance ? <p>That is more than the wallet holds.</p> : null}

          {family === 'evm' ? null : (
            <label>
              Aave position owner (EVM address){' '}
              <input
                value={onBehalfOf}
                placeholder="0x…"
                onChange={(event) => setOnBehalfOf(event.target.value.trim())}
              />
            </label>
          )}

          <label>
            <input
              type="checkbox"
              checked={depositViaWallet}
              onChange={(event) => setDepositViaWallet(event.target.checked)}
            />{' '}
            Send the deposit from this wallet (untick to get a deposit address)
          </label>

          <button type="submit" disabled={!canSubmit}>
            {flow.isBusy ? `Working… (${exec.phase})` : 'Supply to Aave'}
          </button>
        </>
      )}

      {exec.networkFee ? (
        <p>Network fee: {exec.networkFee} (USDC smallest units)</p>
      ) : null}

      {flow.needsExternalDeposit ? (
        <p>
          Send the deposit to <code>{exec.depositAddress}</code>
          {exec.depositMemo ? ` with memo ${exec.depositMemo}` : ''}
          {exec.deadline
            ? ` before ${new Date(exec.deadline).toLocaleTimeString()}`
            : ''}
          .
        </p>
      ) : null}

      {flow.state === 'IN_FLIGHT' ? (
        <p>
          A deposit is already in progress.{' '}
          <button
            type="button"
            onClick={() => {
              void flow.resume();
            }}>
            Resume
          </button>
        </p>
      ) : null}

      {flow.state === 'FAILED' ? (
        <p>
          The wallet transfer did not go through.{' '}
          <button
            type="button"
            onClick={() => {
              void flow.retryDeposit();
            }}>
            Retry transfer
          </button>
        </p>
      ) : null}

      {flow.canCancel ? (
        <button
          type="button"
          onClick={() => {
            void flow.cancel();
          }}>
          {exec.isCancelling ? 'Sign to cancel…' : 'Cancel deposit'}
        </button>
      ) : null}

      {exec.phase === 'success' ? <p>USDC supplied to Aave. 🎉</p> : null}
      {flow.preparationError ? (
        <p>Could not prepare the deposit: {flow.preparationError.message}</p>
      ) : null}
      {exec.error && flow.state === 'IDLE' && exec.phase !== 'success' ? (
        <p>{exec.error.message}</p>
      ) : null}
    </form>
  );
};

// ---------------------------------------------------------------------------
// 2. Verify the wallet
// ---------------------------------------------------------------------------

const REJECTION_COPY = {
  SIGNATURE_REJECTED: 'intents.near rejected the signature.',
  NONCE_REJECTED: 'The proof went stale — try again.',
  PUBLIC_KEY_NOT_REGISTERED:
    'Register this key for your NEAR account on intents.near first (add_public_key).',
} as const;

const VerifyPrompt = ({
  verification,
}: {
  verification: ReturnType<typeof useWalletVerification>;
}) => {
  const { status, verdict, error, verify } = verification;

  return (
    <div>
      <p>
        Verify your wallet to continue. You will sign a message that proves you
        control your intents account — it moves no funds.
      </p>
      <button
        type="button"
        disabled={status === 'verifying'}
        onClick={() => {
          verify().catch(() => undefined); // surfaced through `error`
        }}>
        {status === 'verifying' ? 'Check your wallet…' : 'Verify wallet'}
      </button>
      {verdict && !verdict.ok ? <p>{REJECTION_COPY[verdict.reason]}</p> : null}
      {error ? <p>Verification failed: {error.message}</p> : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3. Log balances, gate the deposit on verification
// ---------------------------------------------------------------------------

const Account = ({ walletName }: { walletName: string }) => {
  const { intentsAccountId, family, address } = useIntentsAccount();
  const verification = useWalletVerification();
  const walletBalances = useWalletBalances();
  const intentsBalances = useIntentsBalances();

  useEffect(() => {
    if (walletBalances.status !== 'success') {
      return;
    }

    const held = walletBalances.tokens
      .filter(
        (token) => BigInt(walletBalances.balances[token.assetId] ?? '0') > 0n,
      )
      .map((token) => ({
        chain: token.blockchain,
        symbol: token.symbol,
        amount: fromAtomic(
          walletBalances.balances[token.assetId]!,
          token.decimals,
        ),
        assetId: token.assetId,
      }));

    console.log(`[wallet balances] ${address}`, held);

    if (Object.keys(walletBalances.errors).length) {
      console.warn('[wallet balances] not fully read:', walletBalances.errors);
    }
  }, [
    address,
    walletBalances.status,
    walletBalances.balances,
    walletBalances.errors,
    walletBalances.tokens,
  ]);

  useEffect(() => {
    if (intentsBalances.status !== 'success') {
      return;
    }

    console.log(
      `[intents balances] ${intentsAccountId} @ block ${intentsBalances.blockHeight}`,
      intentsBalances.entries.map((entry) => ({
        symbol: entry.symbol ?? entry.tokenId,
        amount:
          entry.decimals === null
            ? entry.amount
            : fromAtomic(entry.amount, entry.decimals),
        tokenId: entry.tokenId,
      })),
    );
  }, [
    intentsAccountId,
    intentsBalances.status,
    intentsBalances.entries,
    intentsBalances.blockHeight,
  ]);

  return (
    <section>
      <p>
        {walletName} ({family}) · {address}
      </p>

      {verification.isVerified ? (
        <AaveDeposit />
      ) : (
        <VerifyPrompt verification={verification} />
      )}
    </section>
  );
};

// ---------------------------------------------------------------------------
// 1. Detect the wallet already connected to this site — the entry point
// ---------------------------------------------------------------------------

export const AaveAccountExample = () => {
  const { ready, wallets } = useDetectedWallets();
  const detected = pickConnectedWallet(wallets, ['evm', 'sol', 'near']);
  // Re-derived only when the detected wallet (or its account) changes.
  const { connector, unsupportedReason } = useMemo(
    () => toConnector(detected),
    [detected],
  );

  if (!ready) {
    return <p>Looking for a connected wallet…</p>;
  }

  if (!connector) {
    return (
      <p>
        {unsupportedReason === 'MISSING_PUBLIC_KEY'
          ? 'Your NEAR wallet did not share its public key — reconnect it.'
          : 'Connect an EVM, Solana or NEAR wallet to this site to continue.'}
      </p>
    );
  }

  return (
    <IntentsConnectProvider
      api={connectApi}
      wallet={connector}
      intentsApi={intentsApi}
      alchemyApiKey={ALCHEMY_API_KEY}>
      <Account walletName={detected?.name ?? 'Wallet'} />
    </IntentsConnectProvider>
  );
};
