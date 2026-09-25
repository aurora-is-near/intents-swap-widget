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

**Methods:** `preview`, `run`, `previewSteps`, `runSteps`, `resume`, `retryDeposit`, `cancel`. All are async. Without a connected wallet they reject with `WALLET_NOT_CONNECTED` and don't throw.

## Notes

- **One runner per hook call.** Two `useExecution()` calls give two independent runners.
- **Wallet changes:** the runner is rebuilt when the wallet's address or signing standard changes. If the wallet changes mid-run, `resume()` the execution from the new runner.
- **StrictMode-safe:** a double mount doesn't dispose a live runner.

## Next

- [Examples](../examples/README.md): full React integrations
- [Wallet integrations](../wallet-integrations.md): where `wallet` comes from
