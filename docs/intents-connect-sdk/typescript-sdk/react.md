---
icon: atom
description: IntentsConnectProvider and useExecution, the runner as React state.
---

# React

> **Beta.** Part of the [TypeScript SDK](README.md).

`@aurora-is-near/intents-connect/react` wraps the runner in a provider and a hook. The hook re-renders on every phase or status change, so your UI is just a view of its state.

```tsx
import { createIntentsConnectApi } from '@aurora-is-near/intents-connect';
import {
  IntentsConnectProvider,
  useExecution,
} from '@aurora-is-near/intents-connect/react';

const api = createIntentsConnectApi({ baseUrl, apiKeyProxyUrl });

export function App() {
  const { wallet } = useIntentsConnectWallet(); // from intents-connect-wallet

  return (
    <IntentsConnectProvider api={api} wallet={wallet}>
      <Deposit />
    </IntentsConnectProvider>
  );
}

function Deposit() {
  const exec = useExecution({ onEvent: (e) => console.log(e) });

  return (
    <>
      <button disabled={exec.isBusy} onClick={() => exec.run(plan)}>
        {exec.phase === 'idle' ? 'Deposit' : exec.phase}
      </button>

      {/* only ever set after the signature, so the order can't be wrong */}
      {exec.depositAddress && <Qr value={exec.depositAddress} memo={exec.depositMemo} />}

      {exec.recovery?.kind === 'retry-transfer' && (
        <button onClick={() => exec.retryDeposit()}>Retry deposit</button>
      )}
    </>
  );
}
```

## `IntentsConnectProvider`

| Prop | Type | Notes |
|---|---|---|
| `api` | `IntentsConnectApi` | From `createIntentsConnectApi`. Safe to create inline |
| `wallet` | `WalletConnector \| null` | `null` while disconnected. See [Wallet integrations](../wallet-integrations.md) |
| `plugins`, `pluginOptions`, `makeTransfer` | optional | Deposit transfer, if the wallet has no `makeTransfer` |
| `pollIntervalMs`, `maxPollAttempts`, `logger`, `autoCancelOnSignatureRejection` | optional | Same as the `createExecutionRunner` options |
| `intentsApi` | `IntentsApi` | From `createIntentsApi`. Required by the account hooks below. Safe to create inline |
| `alchemyApiKey` | `string` | Read EVM and Solana wallet balances through Alchemy |
| `rpcs` | `ChainRpcUrls` | Per-chain RPC endpoints, merged over `DEFAULT_RPCS` |
| `sessionStorage` | `KeyValueStorage` | Where user sessions live. Memory by default |
| `verificationStorage` | `KeyValueStorage` | Where verified wallets are remembered. `localStorage` by default |

## `useExecution()`

**State**

| Field | Meaning |
|---|---|
| `phase`, `status` | Client phase and server status ([Lifecycle & errors](lifecycle-and-errors.md)) |
| `isBusy` | An execution is in flight. Disable inputs and tabs |
| `executionId`, `execution` | The current execution |
| `networkFee`, `spendable` | Fee in the destination asset, and what's left to spend |
| `depositAddress`, `depositMemo`, `deadline`, `depositTxHash` | Deposit leg |
| `hasSubmittedSignature`, `isCancelling` | Progress flags |
| `error`, `recovery` | Last error, and the suggested action (`resume-or-cancel` / `retry-transfer`) |

**Methods:** `preview`, `run`, `previewSteps`, `runSteps`, `runOut`, `resume`, `retryDeposit`, `cancel`. All are async. Without a connected wallet they reject with `WALLET_NOT_CONNECTED` and don't throw.

## `useIntentsConnectFlow()`

The glue around `useExecution` that every integration otherwise writes: build a plan from your own input, run it, and expose the recovery states.

```tsx
const flow = useIntentsConnectFlow({
  buildPlan: ({ token, amount }) => buildMyPlan(token, amount),
});

flow.submit({ token, amount }); // single-flight
// buildPlan failures land in flow.preparationError; run failures in flow.exec.error
```

| Field | Meaning |
|---|---|
| `state` | `IDLE`, `IN_FLIGHT` (resume or cancel) or `FAILED` (retry the transfer or cancel) |
| `isBusy`, `preparationError` | Building, running or cancelling; `buildPlan` (or `executePlan`) threw — run failures are on `exec.error` |
| `needsExternalDeposit` | Show `exec.depositAddress` / `depositMemo` / `deadline` for a QR or exchange deposit |
| `canCancel` | A dead end the user can back out of |
| `resume()`, `retryDeposit()`, `cancel()` | Recovery actions. `resume({ depositViaWallet: true })` lets a resume this runner did not drive re-prompt the wallet transfer — pass it only when you know no deposit was made |
| `exec` | The underlying `useExecution()` result |

## `useIntentsOutFlow()`

The same glue for out-operations (`runOut`): steps release funds where the intermediary holds them, and 1Click pays them out. One signature, no deposit.

```tsx
const out = useIntentsOutFlow({
  buildPlan: ({ amount, to }) => buildMyWithdrawPlan(amount, to),
});

const settled = await out.submit({ amount, to }); // single-flight
// undefined when it did not succeed: the reason is on out.error
```

| Field | Meaning |
|---|---|
| `stage` | `idle`, `preparing`, `signing`, `paying-out`, `success`, `failed`, or `in-flight` (another execution holds the lock: resume or cancel) |
| `isBusy`, `error` | Building, running or cancelling; `buildPlan` threw or the run failed |
| `networkFee`, `payout`, `quote` | The measured fee, what 1Click receives, and its quote (`amountOut`, `minAmountOut` in the destination token) |
| `canCancel` | A created execution, never signed, still holds the lock |
| `resume(executionId?)`, `cancel()` | Recovery actions. `resume` takes an id from a list of executions (after a reload), else the in-flight one. Both resolve, never reject |
| `exec` | The underlying `useExecution()` result |

## `useQuotePreview()`

A live quote while the user is still editing: a dry `preview` of the plan once the input settles, re-quoted while it stays the same.

```tsx
const flow = useIntentsConnectFlow({ buildPlan: (preview) => preview.plan });
const plan = useMemo(
  () => (amount ? buildMyPlan(token, amount) : null), // leave quote.deadline unset
  [token, amount],
);
const quote = useQuotePreview({ exec: flow.exec, plan });

// quote.preview.execution.quote.minAmountOut, .details.networkFee, .details.estimatedTime
flow.submit(quote.preview); // runs exactly the previewed steps
```

| Field | Meaning |
|---|---|
| `preview` | The latest preview of the **current** plan. A result for an older plan is dropped. `preview.plan` carries the prepared steps for `run` |
| `isLoading`, `error` | A preview is on its way (debounce included); why the last one failed |
| `expiresAt` | Epoch ms when the previewed quote's deadline passes |
| `refresh()` | Re-quotes now |

Options: `debounceMs` (500), `refreshIntervalMs` (30 s while the page is visible, `0` never). A new plan object is a new quote, so memoize it.

## `useSupportedTokens()`

What Intents Connect routes, from `listSupportedTokens`. Fetched once per provider and flow, shared by every caller. Needs no wallet and no `intentsApi`.

```tsx
const { origins, destinations, status } = useSupportedTokens(); // { flow: 'outOperation' } swaps the lists
const canDeliver = destinations.some(
  (token) => token.blockchain === 'base' && token.contractAddress === usdc,
);
```

`origins` are the tokens an execution can start from (`in`): what the user can pay with. `destinations` are the tokens it can deliver (`out`): a recipe's `destination`.

## `useWalletExecutions()`

The provider wallet's executions, newest first, from `listExecutions`. Shared at provider level and needs no `intentsApi`. With `IN_FLIGHT_STATUSES` it finds the execution holding the wallet's lock, so a page can pick it up after a reload:

```tsx
import { IN_FLIGHT_STATUSES } from '@aurora-is-near/intents-connect';

const { executions, status } = useWalletExecutions({ status: IN_FLIGHT_STATUSES });
const live = executions[0];

if (live) await flow.exec.resume(live.id); // or flow.exec.cancel(live.id)
```

Options: `status` (one or several; all when unset), `refreshIntervalMs` (30 s, `0` never).

## Account hooks

Need `intentsApi` on the provider. See [Account & balances](account-and-balances.md).

| Hook | Returns |
|---|---|
| `useIntentsAccount()` | `intentsAccountId`, `family`, `address` of the provider wallet |
| `useWalletBalances({ refreshIntervalMs?, address?, family? })` | `balances`, `errors`, `tokens`, `status`, `refresh` |
| `useIntentsBalances({ refreshIntervalMs? })` | `balances`, `entries`, `blockHeight`, `status`, `refresh` |
| `useWalletVerification()` | `isVerified`, `verify()`, `status`, `verdict`, `error` |
| `useIntentsAuth()` | `status`, `authorize({ verify? })`, `logout()`, `error` |
| `useConfidentialBalances({ tokenIds?, refreshIntervalMs? })` | `balances`, `entries`, `status`, `refresh` — idle until authorized |

## Notes

- **One runner per hook call.** Two `useExecution()` calls give two independent runners.
- **Wallet changes:** the runner is rebuilt when the wallet's address or signing standard changes. If the wallet changes mid-run, `resume()` the execution from the new runner.
- **StrictMode-safe:** a double mount doesn't dispose a live runner.

## Next

- [Examples](../examples/README.md): full React integrations
- [Wallet integrations](../wallet-integrations.md): where `wallet` comes from
- [Account & balances](account-and-balances.md): what the account hooks read
