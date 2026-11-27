---
icon: list-check
description: Describe destination-chain steps with a recipe, and choose how the network fee is sized.
---

# Recipes & fees

> **Beta.** Part of the [TypeScript SDK](README.md).

A **recipe** says what the intermediary account should do on the destination chain. The runner calls its `buildSteps` with the intermediary address and an amount, then submits the steps.

## Recipe

| Field | Type | Meaning |
|---|---|---|
| `id`, `intent`, `title` | `string` | Identify the integration. `intent` and `title` are echoed into execution metadata |
| `flow` | `'bridge-in' \| 'steps-only'` | Bridge funds in first, or act on funds already in the intermediary |
| `type` | `'evm' \| 'solana'` | Which intermediary runs the steps. Use `Recipe` for EVM and `SolanaRecipe` for Solana |
| `destination` | `{ chain, assetId, tokenAddress? }` | What arrives at the intermediary. Leave `tokenAddress` out for native assets |
| `buildSteps(ctx, params)` | `→ Step[]` (EVM; `AsyncRecipe`: `→ Promise<Step[]>`) · `→ PreparedSteps` (Solana, may be async) | Builds the calls. `ctx = { intermediary, userAddress, amount }` |

## Flows

| Flow | What happens | Runner calls |
|---|---|---|
| `bridge-in` | User funds on any chain → bridged to the intermediary → steps run | `preview` / `run` |
| `steps-only` | No bridge: steps spend what the intermediary already holds (e.g. sell, withdraw) | `previewSteps` / `runSteps` |
| `out-operation` | Steps release funds where the intermediary holds them, then 1Click pays them out to `quote.recipient` on any chain (or intents account) | `runOut` |

## EVM steps

A step has **exactly** these keys. Any other key is rejected (`ILLEGAL_STEP_SHAPE`).

```ts
{
  to: '0x…',                                    // contract
  functionSignature: 'approve(address,uint256)', // ABI-encoded by the service
  parameters: [spender, amount],                 // tuples are nested arrays
  value: '0',                                    // native value, atomic
  metadata: { … },                               // optional
}
```

## Solana steps

Solana recipes return `PreparedSteps`: `{ steps, addressLookupTables? }`. Don't build them by hand. Pass your instructions through `prepareSolanaSteps` from [`intents-connect-wallet/solana`](../wallet-integrations.md#solana-step-helpers). It swaps the intermediary pubkey for a placeholder and drops compute-budget instructions.

## Placeholders

The service fills these strings in when it executes the steps.

| Placeholder | Filled with |
|---|---|
| `{INTERMEDIARY}` | The intermediary account address |
| `{MIN_AMOUNT_OUT}` | The guaranteed amount delivered to the intermediary, after the fee |
| `{AMOUNT_IN}` | The input amount |
| `{DEPOSIT_ADDRESS}` | The deposit address |

> **Treat `ctx.amount` as opaque.** Under the default EVM fee strategy it is the literal `{MIN_AMOUNT_OUT}`. Put it in parameters or `value`, but never do arithmetic on it.

## Rules and limits

| Rule | Why | Fix |
|---|---|---|
| At least one step must call `destination.tokenAddress` | The service's fee is charged in the destination token | Usually already true (an `approve`). Otherwise add a zero-value transfer to the intermediary. Native destinations are exempt |
| No `quote.recipient` on a bridge-in | The intermediary is the recipient | Put the final recipient into a step's parameters (see [Polymarket](../examples/polymarket.md)) |
| Max 30 EVM / 50 Solana steps | Service limit | Batch calls |
| Solana: at most 16 lookup tables, a payload of at most 256 KiB, no ComputeBudget program, only the intermediary may sign | The relayer adds its own payer, nonce and compute budget | Use `prepareSolanaSteps` |

## Fee strategies (bridge-in)

The service charges a network fee, which reimburses destination gas. It is paid in the destination asset as a final transfer step the service appends.

| | `{ kind: 'placeholder' }` | `{ kind: 'threeRound', amountReserveBps? }` |
|---|---|---|
| Default for | EVM | Solana (the only one allowed) |
| `ctx.amount` | `{MIN_AMOUNT_OUT}` | A literal atomic amount |
| API create calls | 1 | 3: dry → dry → real |
| Exact spendable amount known before signing | No | Yes, via the `quoted` event |
| Use when | Amounts can be templated | You must know the exact amount (e.g. to build a Jupiter swap) |

How `threeRound` works:

1. A dry create with no steps gives the gross `minAmountOut`.
2. The steps are built at the gross amount. A second dry create measures `networkFee`.
3. `spendable = (minAmountOut − networkFee) × (1 − reserve)`. The steps are rebuilt at that amount and the real execution is created.

`preview(plan)` runs rounds 1–3 without creating anything. `run(preview.plan)` then commits exactly those steps. If the quote got worse in the meantime, it throws `QUOTE_MOVED` before the user signs.

## Fees for steps-only executions

| | Fee comes out of what the steps **produce** | Fee comes out of what the steps **spend** |
|---|---|---|
| Example | Swap ORCA → USDC | Transfer USDC out |
| Plan | `feeFromAmount` unset | `feeFromAmount: true` or `{ amountReserveBps }` |
| Rounds | 1 dry to measure the fee, then real | Dry at `amount`, rebuild at `amount − fee − reserve`, then real |
| Fee cap | `maxNetworkFee` if given | Automatic |

A steps-only preview is valid for 30 s (`previewTtlMs`).

## Hosted actions

An action in the [Intents Connect actions catalog](https://github.com/aurora-is-near/intents-connect-actions) resolves its own steps on the server. `actionRecipe` turns one into a recipe for the runner: each `buildSteps` calls `POST /api/v1/actions/{id}/resolve` and returns the resolved steps. The runner still builds the creation body, quote and fees as for any recipe, so the recipe's static fields must describe what the action resolves to.

```ts
import {
  actionRecipe,
  createIntentsConnectActionsApi,
} from '@aurora-is-near/intents-connect';

const actionsApi = createIntentsConnectActionsApi({
  baseUrl: 'https://intents-connect-actions-demo.aurora.dev',
});

const borrowRecipe = actionRecipe<{ borrowAmount: string }>({
  api: actionsApi,
  actionId: 'aave-v3-borrow',
  version: 1,
  // Pin the reviewed definition and script: a changed action answers 409.
  expectedSha256Hash: 'cf4a065b…83fa',
  id: 'aave-borrow:base:ETH:USDC',
  intent: 'aave_borrow',
  title: 'Borrow USDC against ETH on Aave Base',
  flow: 'bridge-in',
  destination: { chain: 'base', assetId: 'nep141:base.omft.near' },
  // Called on every build: map `ctx.amount` through, never fix it here.
  inputs: (ctx, { borrowAmount }) => ({
    chain: 'base',
    collateral: 'ETH',
    borrowAsset: 'USDC',
    borrowAmount,
    recipient: ctx.userAddress,
    amount: '3000000000000000',
    originAsset: 'nep141:eth.omft.near',
  }),
});
```

- **Checked on every build.** The resolved execution must be EVM, have the shape of `flow` (a quote for bridge-in, a top-level `destinationAsset` for steps-only, `outOperation` for an out-operation), deliver `destination.assetId`, and carry the recipe's `intent` and `title`. Anything else throws `GuardError` `ACTION_MISMATCH`.
- **Errors.** A non-2xx answer throws `IntentsConnectActionsApiError` with the API's message and `status`; `isHashMismatch` (409), `isInvalidInput` (400) and `isUnknownAction` (404) name the common cases.
- **One request per build.** A bridge-in `preview` resolves once and `run` reuses the prepared steps. A steps-only preview with `feeFromAmount` resolves again at the post-fee amount.
- **Placeholders pass through.** `{INTERMEDIARY}` and `{MIN_AMOUNT_OUT}` in the resolved steps are filled in by the service at creation, as in any recipe.

`createIntentsConnectActionsApi` also has `listActions()`, the catalog with each action's input schema and `sha256Hash`. Its endpoints need no API key.

## Next

- [Lifecycle & errors](lifecycle-and-errors.md)
- [Examples](../examples/README.md) show each strategy in a real integration: placeholder in [Hydrex](../examples/hydrex.md) and [Polymarket](../examples/polymarket.md), threeRound and steps-only in [Solana (Jupiter)](../examples/solana-jupiter.md)
- [Fees Collection](https://docs.intents.aurora.dev/intents-connect/integration-best-practices/fees-collection) · [Steps destination token requirement](https://docs.intents.aurora.dev/intents-connect/developer-guides/evm/steps-destination-token-requirement)
