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
| `buildSteps(ctx, params)` | `→ Step[]` (EVM) · `→ PreparedSteps` (Solana, may be async) | Builds the calls. `ctx = { intermediary, userAddress, amount }` |

## Flows

| Flow | What happens | Runner calls |
|---|---|---|
| `bridge-in` | User funds on any chain → bridged to the intermediary → steps run | `preview` / `run` |
| `steps-only` | No bridge: steps spend what the intermediary already holds (e.g. sell, withdraw) | `previewSteps` / `runSteps` |

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

## Next

- [Lifecycle & errors](lifecycle-and-errors.md)
- [Examples](../examples/README.md) show each strategy in a real integration: placeholder in [Hydrex](../examples/hydrex.md) and [Polymarket](../examples/polymarket.md), threeRound and steps-only in [Solana (Jupiter)](../examples/solana-jupiter.md)
- [Fees Collection](https://docs.intents.aurora.dev/intents-connect/integration-best-practices/fees-collection) · [Steps destination token requirement](https://docs.intents.aurora.dev/intents-connect/developer-guides/evm/steps-destination-token-requirement)
