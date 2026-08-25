# @aurora-is-near/intents-connect

Headless client for the Aurora **Intents Connect** execution API: bridge any
asset from any chain, then execute contract calls on the destination chain from
a service-controlled *intermediary* account.

No React, no chain SDKs. Its only runtime dependencies are `valtio-fsm` and
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
fee-transfer step, so `spendable + networkFee ≤ quote.minAmountOut`. That is
circular — the amount depends on the fee, the fee on the steps, the steps on the
amount. Two ways out:

| | `{ kind: 'placeholder' }` (default) | `{ kind: 'threeRound' }` |
|---|---|---|
| Create calls | 1 | 3 (dry, dry, real) |
| Who sizes the amount | the service | you |
| Exact figure before signing | no | yes, via the `quoted` event |

## Wallets

`WalletConnector` is the only wallet seam. Bring your own, or use a
`@aurora-is-near/intents-connect-wallet-*` package. It supplies the address,
signing standard, providers, and the deposit transfer.

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
ABI scalars, so `Step['parameters']` stays `string[]` and the assertion starts
failing once the spec is corrected.

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

## Wallets

Deposit transfers and wallet connection live in
[`@aurora-is-near/intents-connect-wallet`](../intents-connect-wallet), one
subpath per chain.
