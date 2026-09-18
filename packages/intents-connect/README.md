# @aurora-is-near/intents-connect

Headless client for the Aurora **Intents Connect** execution API: bridge any
asset from any chain, then execute contract calls on the destination chain from
a service-controlled *intermediary* account.

No React, no chain SDKs. Its only runtime dependencies are `valtio` and
`@scure/base`.

## What it does for you

A new integration is a **step builder**. Everything else — intermediary
resolution, fee arithmetic, the four signing standards, deposit routing,
polling, 409 and expiry recovery — is handled here.

```ts
import {
  createIntentsConnectApi,
  createExecutionRunner,
  type Recipe,
} from '@aurora-is-near/intents-connect';

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// `amount` is opaque — a literal atomic string, or the {MIN_AMOUNT_OUT}
// placeholder. Template it; never inspect it. That is what lets one builder
// serve both fee strategies.
const supply: Recipe<{ pool: string }> = {
  id: 'aave-supply',
  intent: 'aave_supply',
  title: 'Supply to Aave',
  flow: 'bridge-in',
  type: 'evm',
  destination: { chain: 'base', assetId: 'nep141:base-…', tokenAddress: USDC },
  buildSteps: ({ intermediary, amount }, { pool }) => [
    { to: USDC, functionSignature: 'approve(address,uint256)',
      parameters: [pool, amount], value: '0' },
    { to: pool, functionSignature: 'supply(address,uint256,address,uint16)',
      parameters: [USDC, amount, intermediary, '0'], value: '0' },
  ],
};

const runner = createExecutionRunner({
  api: createIntentsConnectApi({ baseUrl, apiKeyProxyUrl }),
  wallet: connector,
  onEvent: (event) => console.log(event),
});

await runner.run({
  recipe: supply,
  params: { pool: '0x…' },
  quote: { originAsset, destinationAsset, amount, swapType: 'EXACT_INPUT', slippageTolerance: 100 },
  originChain: 'base',
  originToken: { contractAddress: USDC, decimals: 6 },
  depositViaWallet: true,
});
```

## Lifecycle

```
idle → resolving-identity → planning → creating → awaiting-signature → submitting
                                                                          │
                                          ┌───────────────────────────────┤
                                          ▼                               ▼
                                 awaiting-deposit ───────────────────► settling
                                          │                               │
                                          └──► expired ──┐                ▼
                                                         └────► success | failed
```

Two phases behave in non-obvious ways:

- **Signing happens before the deposit.** The service holds a pre-signed batch
  and fires it when the bridge settles. A deposit address is therefore never
  exposed until the signature is submitted — enforced by a guard.
- **`expired` is not terminal.** A deposit that settles late revives an
  execution straight to `OPERATION_PROCESSING`, so polling continues.

## Fee strategies

The gas fee is charged in the *destination* token and the backend appends its own
fee-transfer step, so the bridged funds must cover both the spend and the fee. That is
circular — the amount depends on the fee, the fee on the steps, the steps on the
amount. Two ways out:

| | `{ kind: 'placeholder' }` (default) | `{ kind: 'threeRound' }` |
|---|---|---|
| Create calls | 1 | 3 (dry, dry, real) |
| Who sizes the amount | the service | you |
| Exact figure before signing | no | yes, via the `quoted` event |

## Wallets

`WalletConnector` is the only wallet seam. Bring your own, or use
[`@aurora-is-near/intents-connect-wallet`](../intents-connect-wallet) (one
subpath per chain). It supplies the address, signing standard, providers, and
the deposit transfer.

Signing standards implemented: `erc191`, `raw_ed25519`, `nep413`, `sep53`.
`tip191` (Tron) and `ton_connect` (TON) are not yet covered.

## Guards

Every protocol precondition is a named guard throwing a `GuardError` with a
`GuardCode` — `FEE_NOT_ESTIMATED`, `QUOTE_MOVED`,
`DEPOSIT_BEFORE_SIGNATURE`, `EXECUTION_IN_FLIGHT`, `MEMO_REQUIRED` and others.
They exist so the failure names the cause instead of surfacing an opaque 400.

## Keeping up with the API

The wire contract is pinned against the live OpenAPI document:

```bash
yarn generate:api   # refresh src/api/generated/openapi.ts
yarn typecheck      # conformance assertions fail if the contract drifted
```

The generated file is committed and is **not** part of the public API — none of
the 26 schemas declare `required`, so every generated field is optional and
exposing them would erase the invariants the guards enforce. Instead
`src/api/generated/conformance.ts` asserts our hand-written types still match,
with errors that name what moved:

```
Type '"OPERATION_REFUNDED"' does not satisfy the constraint 'never'
Type '"depositAddress"' does not satisfy the constraint 'never'
```

Point it at another environment with
`INTENTS_CONNECT_OPENAPI_URL=<url> yarn generate:api`.

One deviation is pinned deliberately: the document types step `parameters` as
`array` of `object`, which generates an uninhabited element type. Parameters are
ABI scalars or nested arrays of them, so `Step['parameters']` stays the
recursive `StepParameter[]` and the assertion starts failing once the spec is
corrected.

## React

The bindings ship in this package under the `/react` subpath — the root export
stays headless and never resolves `react`:

```tsx
import { createExecutionRunner } from '@aurora-is-near/intents-connect';
import {
  IntentsConnectProvider,
  useExecution,
} from '@aurora-is-near/intents-connect/react';

<IntentsConnectProvider api={api} wallet={connector}>
  <Deposit />
</IntentsConnectProvider>;

function Deposit() {
  const { phase, depositAddress, isBusy, run } = useExecution();
  // `depositAddress` is only ever set after the signature is submitted, so a QR
  // rendered from it cannot get the ordering wrong.
}
```

`react` is an **optional** peer dependency, so a Node, worker or CLI consumer
installs nothing extra and importing the root works without React present.

Notes:

- A runner is created **per `useExecution` call**, not per provider, so two
  concurrent executions never share a machine.
- State is read through valtio's `useSnapshot`, so a component only re-renders
  for fields it actually reads.
- `run`, `resume` and `cancel` always **reject** rather than throwing
  synchronously, so `run(plan).catch(…)` behaves.


## Solana bridge-in previews

Use `SolanaRecipe<TParams>` for a Solana destination. Its asynchronous
`buildSteps({ intermediary, userAddress, amount }, params)` returns
`{ steps: SolanaStep[], addressLookupTables?: string[] }`. Existing EVM
`Recipe` builders keep their synchronous API.

Solana uses the existing `threeRound` fee strategy: build at the gross bridge
amount to measure the fee, then rebuild at the concrete post-fee amount.
Solana responses keep `quote.minAmountOut` as the gross bridge guarantee and
report `details.networkFee` separately. The SDK subtracts that fee before
building instructions and checks `encoded input + fee <= gross guarantee`
again before signing and on unsigned resume. EVM responses already report a
net minimum; their fee is not subtracted again.
An optional `feeStrategy: { kind: 'threeRound', amountReserveBps: 25 }` leaves
0.25% of the post-fee guarantee out of the encoded input, rounded down in atomic
units, to cover movement before real create. It defaults to zero. Account for
this reserve in the application's slippage budget and display output estimates
for the actual prepared input. Unspent funds remain at the intermediary.
Instruction fetching and encoding belong to the caller; the SDK does not
include a Jupiter client. The wallet package's
[`/solana` helpers](../intents-connect-wallet#solana-execution-instructions)
convert native instructions and prepare recipient token accounts.

```ts
const preview = await runner.preview(solanaPlan);
// Show the caller's final-token quote; preview.execution.quote is the bridge quote.
// After the user accepts, commit these exact prepared instructions:
const execution = await runner.run(preview.plan);
console.log(execution.id, execution.transaction?.solanaTxHash);
```

`preview()` makes only dry create requests, emits no runner events, and leaves
the active machine untouched. It returns the final dry response and a plan
containing an immutable snapshot of the prepared steps and lookup tables.
`useExecution()` exposes the same `preview()` method.
If a final Solana dry response no longer funds its instructions, preview rebuilds
them at the latest post-fee amount (with any configured reserve), at most twice.
Only a successfully checked build is returned. This never changes a committed
execution or triggers signing, funding, or cancellation.

`run(preview.plan)` checks the wallet, intermediary, quote, deadline, and real
post-fee guarantee before signing. A fee increase is acceptable only if the
returned guarantee still covers the encoded input. A missing fee or lower
guarantee rejects before signing; an already-created execution remains
available for cancellation. `validateExecution` on the plan can impose
additional acceptance checks (such as the final token minimum).

Resume uses the existing execution and never rebuilds its instructions. The
prepared spendable amount is saved in execution metadata and checked again
when an unsigned Solana execution resumes. After reload, pass any
application-specific `validateExecution` check to `resume()` again. Existing
safe deposit-resume rules still apply: persist the execution ID and deposit
hash, and do not force `depositViaWallet: true` if a deposit may be in flight.

The service's full transaction size, compute budget, gasless USDC fee handling,
and actual recipient delivery still need a controlled integration check before
enabling a swap route.

## Steps-only executions

A `steps-only` execution spends what the intermediary **already holds**: no
1Click quote, no deposit leg. The service still appends its fee-transfer step,
charged in the recipe's `destination.assetId`, and answers a signing payload.

```
idle → resolving-identity → planning → creating → awaiting-signature
     → submitting → settling → success | failed
```

Give the recipe `flow: 'steps-only'` and drive it with `runSteps()` /
`previewSteps()` (also on `useExecution()`):

```ts
const sell: SolanaRecipe = {
  id: 'sell-orca', intent: 'sell_orca', title: 'Sell ORCA to USDC',
  flow: 'steps-only', type: 'solana',
  destination: { chain: 'sol', assetId: USDC_ASSET_ID, tokenAddress: USDC_MINT },
  buildSteps: async ({ intermediary, amount }) => jupiterSwap(intermediary, amount),
};

const preview = await runner.previewSteps({
  recipe: sell, params: undefined,
  amount: orcaBalance,          // ctx.amount for buildSteps
  maxNetworkFee: minimumUsdcOut, // refuse a fee that would eat the output
});
// preview.networkFee, preview.spendable — show them, then commit verbatim:
await runner.runSteps(preview.plan);
```

Two fee shapes:

| | fee comes out of what the steps **produce** | fee comes out of what the steps **spend** |
|---|---|---|
| Example | swap ORCA → USDC | transfer USDC out |
| Plan | `feeFromAmount` unset | `feeFromAmount: true` or `{ amountReserveBps }` |
| Rounds | one dry (measure), real | dry at `amount`, rebuild at `amount − fee − reserve`, real |
| `spendable` | `amount` | `amount − fee − reserve` |
| Fee cap | `maxNetworkFee` if given | `amount − spendable`, automatic |

The cap is enforced against the dry and the real create's `details.networkFee`
before signing (`FEE_EXCEEDS_AMOUNT`), and recorded in
`metadata.intentsConnectFeeBudget` so an unsigned cross-session `resume()`
re-checks it. `metadata.intentsConnectFlow: 'steps-only'` marks the execution
for `resume()` on deployments that omit `executionMode`.

`previewSteps()` runs on an isolated machine (no events, no real create) and
returns a frozen `prepared` snapshot valid for `previewTtlMs` (default 30 s).
`runSteps(preview.plan)` refuses an expired snapshot, a different wallet or
intermediary, or a changed `amount` with `QUOTE_MOVED`. When the fee is carved
from the spent amount and the confirming dry reports a higher fee, the preview
rebuilds at the new fee at most twice.

A missing `details.networkFee` is fatal only when the fee is carved from the
spent amount (`FEE_NOT_ESTIMATED`) — the steps cannot be sized without it.
Otherwise the service still appends its fee transfer and the steps stay
committable; `networkFee` is then simply absent from the preview and the
`quoted` event is not emitted.

Steps-only and bridge-in executions share the per-wallet in-flight lock: a live
one of either kind blocks the other until it settles or is cancelled. A `503`
from the steps endpoint means no Solana durable-nonce account was free — retry
shortly. `retryDeposit()` does not apply; there is nothing to deposit.
