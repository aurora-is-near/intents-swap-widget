---
icon: book-open
---

# EVM steps - Aave withdraw

A worked, self-contained example of redeeming an **Aave V3** supply position on an EVM chain and bridging the proceeds out to another chain — burning the aTokens you received when you supplied, and getting the underlying token back plus accrued interest.

This is an **out-operation** (`outOperation: true`): the intermediary already holds the position, the steps run on the **origin** chain, and a final transfer pushes the result to the 1Click deposit address that bridges it out. There is no user deposit — nothing to fund, nothing to wait for on the origin side.

Withdrawing is the mirror of supplying:

1. **`withdraw`** — burn aTokens and return the underlying token (plus interest) to the intermediary.
2. **`transfer`** — a **producer** step that moves the proceeds to the 1Click deposit address, which bridges them to the destination chain.

The service then appends its own fee step. This doc covers the **amount recalculation** flow — two rounds against the create endpoint: a `dry: true` preview, then a `dry: false` create that carries the amount the preview computed.

### The two rounds

| Round | `dry`   | What it is for                                                                                                                                                            |
| ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `true`  | preview: the gas fee, the amount that will actually be bridged, and the destination estimate. Creates nothing.                                                            |
| 2     | `false` | same body, with the producer transfer's amount replaced by round 1's `quote.amountIn`. Creates the execution, resolves `{DEPOSIT_ADDRESS}`, prepares the signing payload. |

Both rounds are `POST /api/v1/executions/{wallet}`. Signing and `POST …/submit` follow as on any execution — that call carries a signature, not an amount, so it is not part of the recalculation.

### Recomputing the amount between the rounds

The producer transfer cannot forward the whole withdrawal: the appended fee step has to be paid out of the same proceeds. So the amount in that step is `amount − networkFee`, and `networkFee` is not known until something has quoted. That is what round 1 is for.

```
round 1  → details.networkFee = 6952,  quote.amountIn = 190421
           (190421 = 197373 − 6952)

round 2  → producer step amount: 197373 → 190421
           withdraw step amount: 197373 (unchanged)
           quote.amount:         197373 (unchanged)
```

**Only the producer step changes.** The `withdraw` still pulls the full amount out of Aave, and `quote.amount` is still the full amount — that is the origin exposure the user signs for. The carve splits it: `190421` bridges out, `6952` pays the fee.

`quote.amountIn` from round 1 is the number to copy. It is already `amount − networkFee` — no arithmetic needed on your side.

> **The service also computes this itself.** It re-estimates the fee on round 2 and overwrites the producer step's amount with its own `amount − networkFee`, both in the `steps` it returns and in the calls the signature covers. So a figure that has moved since round 1 cannot break the batch, and sending the full amount in both steps works too — that is the single-round variant. Carve it anyway when the UI has to show the exact split before the user signs, and read the returned `steps` to see what the service settled on.

#### What not to carry forward

Four things go wrong if you treat the dry response as a template for round 2.

* **Do not echo the response's `steps` array.** It already carries the appended fee transfer. Send it back and the service appends a _second_ one — nothing rejects it, and the batch then tries to pay the fee twice, overdrawing what the withdraw produced. Rebuild the steps from your own source, or drop the appended step (the one whose `metadata.name` is `Fee Transfer`).
* **Do not bake in the deposit address.** Every quote mints a fresh one. Keep `{DEPOSIT_ADDRESS}` literal in round 2 — the create asserts the steps contain a transfer to the address _it_ just allocated.
* **Do not replace `{AMOUNT_IN}` with the number you saw.** On EXACT\_OUTPUT the service rewrites only the producer step, to the _fresh_ `quote.amountIn`; a stale figure left in the `withdraw` step is not touched. The withdraw then pulls less than `producer + fee` and the batch reverts on the fee transfer.
* **Do not subtract the fee from `quote.amount`.** The service deducts it from the input itself before quoting. Pre-subtracting deducts it twice and quotes a smaller bridge than the user asked for. `quote.amount` is identical in both rounds.

#### Chain roles flip on an out-operation

This trips people up, so it is worth stating plainly:

| Field                    | On a bridge-in (supply)                    | On an out-operation (withdraw)                                        |
| ------------------------ | ------------------------------------------ | --------------------------------------------------------------------- |
| `quote.originAsset`      | the token the user sends from their wallet | the token the **steps produce** on the execution chain (USDC on Base) |
| `quote.destinationAsset` | the token the steps consume                | where the proceeds are bridged **to** (SOL)                           |
| Where steps run          | destination chain                          | **origin** chain                                                      |
| Fee denominated in       | the destination token                      | the **origin** token (`originAsset`)                                  |
| Initial status           | `CREATED`                                  | `OPERATION_PENDING`                                                   |
| User deposit             | required                                   | none                                                                  |

`originAsset` is the **underlying** token, not the aToken. The intermediary holds aBasUSDC, but the batch converts it to USDC before the producer transfer, so USDC is what the quote, the fee, and the deposit-address guard are all denominated in.

### Addresses (Aave V3 on Base, USDC)

| Account                 | Address                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| Aave V3 Pool (Base)     | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`                                               |
| USDC (Base)             | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`                                               |
| aBasUSDC (the position) | `0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB`                                               |
| Fee collector           | per-deployment config — read it back from the appended fee step rather than hard-coding it |

**Only `base`, `eth` and `arb` are enabled as EVM execution chains.** Anything else is rejected with `400 blockchain <chain> is not supported as a destination`. The pools on the other two:

| Chain | Pool                                         |
| ----- | -------------------------------------------- |
| `eth` | `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` |
| `arb` | `0x794a61358D6845594F94dc1DB02A252b5b4814aD` |

Fetch the intermediary — the account that holds the position and executes the steps — before building anything:

```http
GET /api/v1/executions/{wallet}/intermediary
```

```json
{ "result": { "evm": "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E" } }
```

Then read the position size straight off the aToken:

```
aBasUSDC.balanceOf(0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E)
```

That balance is the maximum you can withdraw. It grows with accrued interest, so read it immediately before you build the request.

### The steps

```jsonc
"steps": [
  {
    "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",          // Aave Pool
    "functionSignature": "withdraw(address,uint256,address)",
    "parameters": [
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",              // asset = USDC
      "197373",                                                   // amount to withdraw
      "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E"               // to = intermediary
    ],
    "value": "0"
  },
  {
    "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",          // USDC
    "functionSignature": "transfer(address,uint256)",
    "parameters": [
      "{DEPOSIT_ADDRESS}",                                        // resolved server-side
      "197373"                                                    // rewritten to amount − fee
    ],
    "value": "0"
  }
]
```

Three things about this step pair:

* **`{DEPOSIT_ADDRESS}` is not optional.** You cannot know the deposit address before the service fetches the quote, and hard-coding one from an earlier response will not survive: the create path substitutes the _final_ quote's address and then asserts the steps contain a `transfer` of `originAsset` to **that** address. A stale address fails the assertion with `outOperation requires a transfer(tokenAddress, {DEPOSIT_ADDRESS}, amount) step`.
* **The producer amount changes between the two rounds.** The pair above is the round-1 shape — the full `197373` in both steps. On round 2 the producer transfer carries `197373 − 6952 = 190421`, which is round 1's `quote.amountIn`, while the withdraw still pulls the whole amount and the appended fee step takes the remaining `6952`. The step is matched on its target token, signature and recipient — never on the amount — and the service redoes the subtraction itself, so a figure that has gone stale is corrected rather than rejected.
* **`withdraw`'s third parameter is the intermediary**, not the deposit address. The proceeds must land where the next step can spend them.

***

## Round 1 — preview (`dry: true`)

```jsonc
POST /api/v1/executions/BTKcXNp1wSzs9Mp2ejsPrHLr59z5UkEDJgqcWyXGhGc4
// header: x-api-key: <your key>
{
  "version": "1.0",
  "type": "evm",
  "outOperation": true,
  "quote": {
    "originAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
    "amount": "197373",                         // USDC base units (6 decimals)
    "destinationAsset": "nep141:sol.omft.near",
    "slippageTolerance": 100,                   // basis points (1%)
    "swapType": "EXACT_INPUT",
    "deadline": "2026-07-30T12:00:00Z"
  },
  "steps": [
    {
      "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
      "functionSignature": "withdraw(address,uint256,address)",
      "parameters": [
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "197373",
        "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E"
      ],
      "value": "0"
    },
    {
      "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "functionSignature": "transfer(address,uint256)",
      "parameters": ["{DEPOSIT_ADDRESS}", "197373"],
      "value": "0"
    }
  ],
  "metadata": { "title": "Withdraw from Aave", "intent": "aave_withdraw" },
  "dry": true
}
```

```jsonc
// response
{
  "result": {
    "status": "OPERATION_PENDING",
    "details": {
      "intermediaryAddress": "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E",
      "estimatedTime": "32",
      "networkFee": "6952"                      // 0.006952 USDC, taken in the origin token
    },
    "quote": {
      "amount": "197373",
      "amountIn": "190421",                     // 197373 − 6952: what actually gets bridged
      "amountOut": "2214445",                   // lamports
      "minAmountOut": "2192300"                 // worst-case SOL the user receives
    },
    "steps": [ /* your steps, plus the appended fee transfer */ ]
  }
}
```

What to show the user: **`details.networkFee`** (what the operation costs, in USDC) and **`quote.minAmountOut`** (the worst-case amount that reaches their wallet on the destination chain).

The dry round resolves the steps exactly like the create does — the substitution and the producer-amount rewrite are not gated on `dry` — so when 1Click allocates a deposit address for the dry quote you get back fully resolved, already-carved steps. Three caveats make the preview indicative rather than binding:

* **1Click need not allocate a deposit address for a dry quote,** and in practice does not. When there is no address there is nothing to splice in: the returned steps keep `{DEPOSIT_ADDRESS}` and the producer amount is left as you sent it.
* **Gas simulation can fall back.** A transfer to the zero address reverts, so if the address is missing at estimation time the fee comes from a fixed **500000** gas units rather than a measurement. The dry `networkFee` is then conservative, and it can be **absent** entirely if estimation fails another way — the create turns that same failure into a `500`.
* **The producer step is not asserted here.** The check that the steps contain a transfer to the deposit address lives behind the same address-is-present condition, so a body missing it returns `200` on the dry round and `400` on the create. The dry round validates step _encodability_, not out-op shape.

Either way the deposit address on the dry quote is not the one you will use. Read the authoritative fee and address from the `dry: false` response.

The `steps` in that response are the resolved-and-augmented array, fee step included — the same shape the create returns, not an echo of what you sent.

## Round 2 — create (`dry: false`)

The same body with `dry: false`, and with the producer transfer's amount replaced by round 1's `quote.amountIn` — `190421` where round 1 sent `197373`:

```jsonc
POST /api/v1/executions/BTKcXNp1wSzs9Mp2ejsPrHLr59z5UkEDJgqcWyXGhGc4
// header: x-api-key: <your key>
{
  "version": "1.0",
  "type": "evm",
  "outOperation": true,
  "quote": {
    "originAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
    "amount": "197373",
    "destinationAsset": "nep141:sol.omft.near",
    "slippageTolerance": 100,
    "swapType": "EXACT_INPUT",
    "deadline": "2026-07-30T12:00:00Z"
  },
  "steps": [
    {
      "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
      "functionSignature": "withdraw(address,uint256,address)",
      "parameters": [
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "197373",                                     // unchanged: the full position
        "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E"
      ],
      "value": "0"
    },
    {
      "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "functionSignature": "transfer(address,uint256)",
      "parameters": ["{DEPOSIT_ADDRESS}", "190421"],  // ← was 197373: quote.amountIn
      "value": "0"
    }
  ],
  "metadata": { "title": "Withdraw from Aave", "intent": "aave_withdraw" },
  "dry": false
}
```

That one parameter is the only difference from round 1. `quote.amount` is still `197373`, the `withdraw` step still pulls the full `197373`, and `{DEPOSIT_ADDRESS}` is still a placeholder.

If the fee the service measures here differs from the one round 1 previewed — and it usually does, since a dry quote gets no deposit address and its gas estimate falls back — it rewrites the producer step to the new figure. Read the returned amount rather than assuming yours survived.

```jsonc
// 201 response
{
  "result": {
    "id": "eb4c80e8-e491-42da-87d9-f5879d91b7f6",
    "createdAt": "2026-07-30T11:53:45Z",
    "status": "OPERATION_PENDING",
    "details": {
      "intermediaryAddress": "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E",
      "estimatedTime": "32",
      "networkFee": "6952",
      "messageSigned": false,
      "messageToSign": "…",
      "signingStandard": "raw_ed25519",
      "payload": {
        "standard": "raw_ed25519",
        "payload_json": "…",
        "payload_bytes_base64": "…"
      }
    },
    "quote": {
      "amount": "197373",
      "amountIn": "190421",
      "amountOut": "2214445",
      "minAmountOut": "2192300",
      "depositAddress": "0x52dF3dE8e121332635ef319e4af9cCb98fd74a6f",
      "recipient": "BTKcXNp1wSzs9Mp2ejsPrHLr59z5UkEDJgqcWyXGhGc4"
    },
    "steps": [
      {
        "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
        "functionSignature": "withdraw(address,uint256,address)",
        "parameters": [
          "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          "197373",                                        // unchanged: full amount out of Aave
          "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E"
        ],
        "value": "0"
      },
      {
        "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "functionSignature": "transfer(address,uint256)",
        "parameters": [
          "0x52dF3dE8e121332635ef319e4af9cCb98fd74a6f",     // {DEPOSIT_ADDRESS} resolved
          "190421"                                          // 197373 − 6952: matches what you sent
        ],
        "value": "0"
      },
      {
        "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "functionSignature": "transfer(address,uint256)",
        "parameters": ["0x546252c9a0E974f75892b4c54b7a67B69a0aFf45", "6952"],
        "value": "0",
        "metadata": { "name": "Fee Transfer", "description": "Gas fee reimbursement" }
      }
    ],
    "type": "evm",
    "version": "1.0"
  }
}
```

The returned `steps` array is the exact batch the signature covers. Read it back and check the arithmetic — and that the producer amount is still the one you computed from round 1:

```
producer (190421) + fee (6952) = 197373 = what the withdraw pulled out of Aave
```

The user signs the full `197373` of origin exposure; the split between the bridge and the fee is fixed inside the signed batch, so the fee cannot be changed afterwards.

> A `dry: false` create takes an **in-flight lock** for this intermediary. The `dry: true` round does not — it writes no row and takes no lock, so the preview can be re-run freely and never blocks the create that follows it. A second create before the first reaches a terminal state returns `409` `an execution for this wallet is already in progress. Wait for it to complete or fail before creating a new one`. To abandon an attempt, delete it with `DELETE /api/v1/executions/{wallet}/{executionId}` — not a bare DELETE, it needs a body carrying the wallet's signature over the literal string `delete_execution:{executionId}`.

### Sign and submit

`result.details.payload` is signed with the **user's wallet**, using `result.details.signingStandard`. On an out-operation that wallet does not need to be on the execution chain at all — it only signs; the intermediary holds the funds and the service sponsors the gas.

```http
POST /api/v1/executions/{wallet}/submit
```

```json
{
  "executionId": "eb4c80e8-e491-42da-87d9-f5879d91b7f6",
  "publicKey": "ed25519:BTKcXNp1wSzs9Mp2ejsPrHLr59z5UkEDJgqcWyXGhGc4",
  "signature": "ed25519:466cjq2diW62zHhHik8hQQGLjLTg2drnZCEjBxDnUDZCoN4HmcXv4F4WTe2LqDgJk8Ccaq1rjusA47DeUWKegNy1"
}
```

The body is `{ signature, executionId }` for an EVM or Tron origin. An ed25519 origin (Solana, NEAR, Stellar) adds `publicKey`. A TON origin adds both `publicKey` and a `tonConnect` envelope. No `x-api-key` here.

```json
{ "result": { "status": "SIGNING" } }
```

`SIGNING` — rather than the bridge-in flow's `SIGNED_PENDING_DEPOSIT` — is how you know the out-operation went straight to execution: the execution was already `OPERATION_PENDING`, so submitting the signature moves it to `OPERATION_PROCESSING` immediately. There is no deposit phase and no `deposit/submit` call.

### Monitor

```http
GET /api/v1/executions/{wallet}?id={executionId}
```

```
OPERATION_PENDING → OPERATION_PROCESSING → SUCCESS
```

`result` is an **array**, so read `result[0]` even when filtering by a single id.

`OPERATION_FAILED` is terminal. `SUCCESS` means the batch executed on the origin chain **and** the bridge settled — the batch landing on-chain only moves the execution as far as `OPERATION_PROCESSING`, so a long stay there is normal while the bridge leg completes. The API does not currently expose the sponsored batch's transaction hash.

### EXACT\_INPUT vs EXACT\_OUTPUT

|                                | **EXACT\_INPUT**                         | **EXACT\_OUTPUT**                                   |
| ------------------------------ | ---------------------------------------- | --------------------------------------------------- |
| `quote.amount` denominated in  | the **origin** token withdrawn from Aave | the **destination** token the user wants to receive |
| What's fixed                   | how much leaves the position             | how much arrives (`≈ Y`)                            |
| Amount in your steps           | concrete numbers you chose               | the `{AMOUNT_IN}` placeholder                       |
| Producer amount on round 2     | round 1's `quote.amountIn`               | still `{AMOUNT_IN}`                                 |
| Producer transfer, server-side | rewritten to `amount − fee`              | rewritten to `quote.amountIn`                       |
| The user signs                 | `quote.amount`                           | `quote.amountIn + networkFee`                       |

* **EXACT\_INPUT** — "Take 0.197373 USDC out of Aave and bridge whatever survives fees." You know the origin amount up front, so no placeholder is needed, and the producer amount is the one you recompute between the rounds.
* **EXACT\_OUTPUT** — "I want 0.0022 SOL. Take whatever that costs out of Aave." You cannot know the origin amount until the service has quoted, so put **`{AMOUNT_IN}`** wherever the amount appears. The service substitutes `quote.amountIn + networkFee` (the full origin commitment) into every occurrence, then rewrites the producer transfer down to `quote.amountIn`:

```jsonc
"quote": {
  "originAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
  "amount": "2200000",                          // target SOL, in lamports
  "destinationAsset": "nep141:sol.omft.near",
  "swapType": "EXACT_OUTPUT",
  "slippageTolerance": 100
},
"steps": [
  {
    "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
    "functionSignature": "withdraw(address,uint256,address)",
    "parameters": [
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "{AMOUNT_IN}",                            // → amountIn + fee, e.g. 202952
      "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E"
    ],
    "value": "0"
  },
  {
    "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "functionSignature": "transfer(address,uint256)",
    "parameters": ["{DEPOSIT_ADDRESS}", "{AMOUNT_IN}"],   // → rewritten to amountIn, e.g. 196000
    "value": "0"
  }
]
```

`{AMOUNT_IN}` is **out-operation + EXACT\_OUTPUT only**. Anywhere else it is a `400`: `{AMOUNT_IN} placeholder requires outOperation=true and quote.swapType=EXACT_OUTPUT`. Because `quote.amountIn` is the slippage-baked upper bound, 1Click refunds unused slippage to the intermediary (`refundTo` on an out-operation), so the position may end up slightly larger than the arithmetic suggests.

### Where the proceeds land

By default the bridged funds go to the **user's own wallet** on the destination chain. To send them somewhere else, set `quote.recipient`:

```jsonc
"quote": {
  "originAsset": "…",
  "destinationAsset": "nep141:sol.omft.near",
  "amount": "197373",
  "recipient": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
}
```

`quote.recipient` is **out-operation only** — on a bridge-in it is a `400`. Refunds always go back to the intermediary, never to the recipient.

### Rules

* **`x-api-key` is required** on `POST /api/v1/executions/{wallet}`, dry or not. `POST …/submit` does not take it.
* **`outOperation: true` must be set**, and `type` must be `evm` (the default) — with an out-operation the `type` is checked against `originAsset`'s chain, not `destinationAsset`'s.
* **Exactly one producer step is honoured.** The service rewrites the **first** step matching "transfer of `originAsset` to the deposit address" and stops. Any further transfer to that address keeps the amount you sent, un-carved — so the batch would try to move more than the withdraw produced. Send one.
* **`{MIN_AMOUNT_OUT}` is rejected** on an out-operation (`{MIN_AMOUNT_OUT} placeholder is not supported with outOperation=true`) — it substitutes a _destination_ bridge output, and out-op steps run before the bridge.
* **Do not add the fee step yourself.** The service appends it — on a `dry: true` round too, so the `steps` array it hands back is not a valid request body.
* **Step objects accept only `to`, `functionSignature`, `parameters`, `value` and `metadata`.** Anything else is a `400`; free-form data goes in `metadata`.

### Errors you will actually hit

| Response                                                                                                             | Cause                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `400 outOperation requires a transfer(tokenAddress, {DEPOSIT_ADDRESS}, amount) step`                                 | no producer step, the transfer targets the wrong token, or you hard-coded a stale deposit address.                  |
| `400 estimated gas fee exceeds input amount`                                                                         | EXACT\_INPUT only: the fee is ≥ `quote.amount`, so withdrawing this little leaves nothing to bridge. Withdraw more. |
| `400 {AMOUNT_IN} placeholder requires outOperation=true and quote.swapType=EXACT_OUTPUT`                             | `{AMOUNT_IN}` on an EXACT\_INPUT or bridge-in request.                                                              |
| `400 {MIN_AMOUNT_OUT} placeholder is not supported with outOperation=true`                                           | wrong placeholder for this direction.                                                                               |
| `400 quote.recipient is only valid when outOperation=true`                                                           | `recipient` sent on a bridge-in.                                                                                    |
| `400 steps are required for non-dry executions`                                                                      | `dry: false` with an empty `steps` array.                                                                           |
| `409 an execution for this wallet is already in progress. Wait for it to complete or fail before creating a new one` | a previous `dry: false` create is still live.                                                                       |
| `401 missing or invalid api token`                                                                                   | absent or rejected `x-api-key`.                                                                                     |
