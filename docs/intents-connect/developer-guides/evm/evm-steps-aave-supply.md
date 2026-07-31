---
icon: book-open
---

# EVM steps - Aave supply

A worked, self-contained example of bridging a token in from any origin chain and supplying it to an **Aave V3** pool on the destination EVM chain to earn yield.

Supplying is two steps in one execution:

1. **`approve`** — let the Aave Pool pull the bridged token from the intermediary.
2. **`supply`** — move the token into the pool and mint back **aTokens** (the pool's interest-bearing receipt) to the intermediary.

The service then appends its **own** fee step that debits the intermediary in the **destination token**, so the amount you supply and the fee together must not exceed what the bridge actually delivers. This doc covers the **amount recalculation** flow — three rounds, where you compute that amount yourself and can show the user an exact figure before they sign.

### Three rounds vs one

There are two ways to size the supply amount. They produce the same on-chain result; they differ in how many round trips you make and in who computes the number.

|                                   | **single-round** (`{MIN_AMOUNT_OUT}`)      | **three-round** (this doc)                                              |
| --------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| Create requests                   | 1 (`dry: false`)                           | 3 (`dry: true`, `dry: true`, `dry: false`)                              |
| Supply amount in your steps       | the literal `{MIN_AMOUNT_OUT}` placeholder | a concrete `uint256`                                                    |
| Who carves the fee                | the service, inside the same call          | the service too, one round earlier — you copy the carved figure forward |
| Exact figure known before signing | no                                         | yes                                                                     |

`{MIN_AMOUNT_OUT}` exists precisely to collapse this three-round protocol into one call, and it is the better default. Reach for the three-round flow when the UI must display the exact supplied amount and fee **before** the user signs, or when you want a fee preview you can abort on.

#### Why three rounds and not two

The number you need — the post-fee bridged amount — depends on the gas fee, and the gas fee depends on the steps, which depend on the number. The rounds break that cycle:

| Round | `dry`   | `steps`              | What the service does                                                           | What you learn                                                       |
| ----- | ------- | -------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1     | `true`  | `[]` (empty)         | fetches a 1Click quote, **skips** gas estimation entirely                       | the **gross** `quote.minAmountOut` — enough to build realistic steps |
| 2     | `true`  | built from round 1   | estimates gas against your real steps, then carves the fee out of the quote     | `details.networkFee` and the **post-fee** `quote.minAmountOut`       |
| 3     | `false` | rebuilt from round 2 | same as round 2, plus it creates the execution and prepares the signing payload | `id`, `quote.depositAddress`, `details.payload`                      |

Round 1 has to be step-less: gas estimation only runs when `steps` is non-empty, so an empty array is what gets you a quote with no fee deducted. Round 1 must therefore be `dry: true` — a `dry: false` create without steps is rejected with `steps are required for non-dry executions`.

### Addresses (Aave V3 on Base, USDC)

The example uses **USDC on Base**. A different chain or reserve changes the pool and token addresses but not the shape of the steps.

| Account                   | Address                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Aave V3 Pool (Base)       | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`                                               |
| USDC (Base)               | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`                                               |
| aBasUSDC (supply receipt) | `0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB`                                               |
| Fee collector             | per-deployment config — read it back from the appended fee step rather than hard-coding it |

**Only `base`, `eth` and `arb` are enabled as EVM destinations.** Anything else is rejected with `400 blockchain <chain> is not supported as a destination` before the rest of this flow applies. The pools on the other two:

| Chain | Pool                                         |
| ----- | -------------------------------------------- |
| `eth` | `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` |
| `arb` | `0x794a61358D6845594F94dc1DB02A252b5b4814aD` |

The one address you supply yourself is the **intermediary** — the deterministic EVM account where the bridged tokens land, where the steps execute, and which receives the aTokens:

```http
GET /api/v1/executions/{wallet}/intermediary
```

```json
{ "result": { "evm": "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E" } }
```

Fetch it once per wallet, before you build any steps. (For a TON origin, pass `?publicKey=ed25519:<base58>` — a TON address does not expose its public key.)

### The steps

```jsonc
"steps": [
  {
    "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",          // USDC
    "functionSignature": "approve(address,uint256)",
    "parameters": [
      "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",              // Aave Pool
      "87125"                                                     // amount to supply
    ],
    "value": "0"
  },
  {
    "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",          // Aave Pool
    "functionSignature": "supply(address,uint256,address,uint16)",
    "parameters": [
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",              // asset = USDC
      "87125",                                                    // same amount
      "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E",              // onBehalfOf = intermediary
      "0"                                                         // referralCode
    ],
    "value": "0"
  }
]
```

Both amounts are USDC base units (6 decimals). `onBehalfOf` is the intermediary, so the aTokens are minted to the account that will later withdraw them. The `referralCode` is `0` unless Aave issued you one.

***

## Round 1 — gross quote (`dry: true`, no steps)

```jsonc
POST /api/v1/executions/BTKcXNp1wSzs9Mp2ejsPrHLr59z5UkEDJgqcWyXGhGc4
// header: x-api-key: <your key>
{
  "version": "1.0",
  "type": "evm",
  "quote": {
    "originAsset": "nep141:sol.omft.near",
    "amount": "1270000",                        // 0.00127 SOL (9 decimals)
    "destinationAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
    "slippageTolerance": 100,                   // basis points (1%)
    "swapType": "EXACT_INPUT",
    "deadline": "2026-07-30T12:00:00Z"
  },
  "steps": [],
  "metadata": { "title": "Supply to Aave", "intent": "aave_supply" },
  "dry": true
}
```

```jsonc
// response — no details.networkFee, amounts are gross
{
  "result": {
    "status": "CREATED",
    "details": { "intermediaryAddress": "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E", "estimatedTime": "22" },
    "quote": {
      "amountIn": "1270000",
      "amountOut": "95300",
      "minAmountOut": "94275",                  // <- build round-2 steps with this
      "deadline": "2026-07-30T12:00:00Z"
    }
  }
}
```

Take **`quote.minAmountOut`** (`94275`) — the worst-case delivered amount, before the fee. Nothing is created and nothing is reserved by this call.

## Round 2 — measured fee (`dry: true`, real steps)

Same envelope, `dry` still `true`, now with the steps built at `94275`:

```jsonc
POST /api/v1/executions/BTKcXNp1wSzs9Mp2ejsPrHLr59z5UkEDJgqcWyXGhGc4
// header: x-api-key: <your key>
{
  "version": "1.0",
  "type": "evm",
  "quote": {
    "originAsset": "nep141:sol.omft.near",
    "amount": "1270000",
    "destinationAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
    "slippageTolerance": 100,
    "swapType": "EXACT_INPUT",
    "deadline": "2026-07-30T12:00:00Z"
  },
  "steps": [
    {
      "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "functionSignature": "approve(address,uint256)",
      "parameters": ["0xA238Dd80C259a72e81d7e4664a9801593F98d1c5", "94275"],
      "value": "0"
    },
    {
      "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
      "functionSignature": "supply(address,uint256,address,uint16)",
      "parameters": [
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "94275",
        "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E",
        "0"
      ],
      "value": "0"
    }
  ],
  "metadata": { "title": "Supply to Aave", "intent": "aave_supply" },
  "dry": true
}
```

```jsonc
// response — fee measured, amounts carved, fee step echoed
{
  "result": {
    "status": "CREATED",
    "details": {
      "intermediaryAddress": "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E",
      "estimatedTime": "22",
      "networkFee": "7150"                      // 0.00715 USDC
    },
    "quote": {
      "amountIn": "1270000",
      "amountOut": "88150",                     // 95300 − 7150
      "minAmountOut": "87125"                   // 94275 − 7150  <- supply this
    },
    "steps": [
      { "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "functionSignature": "approve(address,uint256)",  "parameters": ["0xA238Dd80C259a72e81d7e4664a9801593F98d1c5", "94275"], "value": "0" },
      { "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5", "functionSignature": "supply(address,uint256,address,uint16)", "parameters": ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "94275", "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E", "0"], "value": "0" },
      {
        "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "functionSignature": "transfer(address,uint256)",
        "parameters": ["0x546252c9a0E974f75892b4c54b7a67B69a0aFf45", "7150"],
        "value": "0",
        "metadata": { "name": "Fee Transfer", "description": "Gas fee reimbursement" }
      }
    ]
  }
}
```

Two things to read out of this response:

* **`details.networkFee`** — the gas fee, denominated in the **destination token**, that the appended step will debit.
* **`quote.minAmountOut`** — already `94275 − 7150 = 87125`. The response amounts are always post-fee once a fee was estimated, so you do **not** subtract again. This is the amount to supply.

**If `details.networkFee` is absent, stop.** It means gas estimation failed, so nothing was carved and `quote.minAmountOut` is still the gross figure. Copying it into round 3 bakes an amount the batch cannot cover once the fee is added. Retry the round instead.

The third step in the echo is the service's own fee transfer. You never send it yourself — it is appended to every response that carries a `networkFee`, dry or not, and it is part of the batch the user signs.

The arithmetic that has to hold at execution time:

```
supplied (87125) + fee (7150) = 94275 = the bridge's guaranteed delivery
```

Anything the bridge delivers above `minAmountOut` simply stays in the intermediary.

## Round 3 — create (`dry: false`, steps rebuilt at the post-fee amount)

Identical body with the steps rebuilt at `87125` and `dry: false`:

```jsonc
POST /api/v1/executions/BTKcXNp1wSzs9Mp2ejsPrHLr59z5UkEDJgqcWyXGhGc4
// header: x-api-key: <your key>
{
  "version": "1.0",
  "type": "evm",
  "quote": {
    "originAsset": "nep141:sol.omft.near",
    "amount": "1270000",
    "destinationAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
    "slippageTolerance": 100,
    "swapType": "EXACT_INPUT",
    "deadline": "2026-07-30T12:00:00Z"
  },
  "steps": [
    {
      "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "functionSignature": "approve(address,uint256)",
      "parameters": ["0xA238Dd80C259a72e81d7e4664a9801593F98d1c5", "87125"],
      "value": "0"
    },
    {
      "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
      "functionSignature": "supply(address,uint256,address,uint16)",
      "parameters": [
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "87125",
        "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E",
        "0"
      ],
      "value": "0"
    }
  ],
  "metadata": { "title": "Supply to Aave", "intent": "aave_supply" },
  "dry": false
}
```

```jsonc
// 201 response
{
  "result": {
    "id": "33ca3807-0e1b-455f-a6dd-1a482ec9b385",
    "createdAt": "2026-07-30T11:51:41Z",
    "status": "CREATED",
    "details": {
      "intermediaryAddress": "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E",
      "estimatedTime": "22",
      "networkFee": "7150",
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
      "amount": "1270000",
      "amountIn": "1270000",
      "amountOut": "88150",
      "minAmountOut": "87125",
      "depositAddress": "81VBKaGXxy6chA9KjsiuLiAqiaNnsTvjRLe2DX1jYq9M",
      "depositMemo": null,
      "recipient": "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E"
    },
    "steps": [ /* your two steps at 87125, plus the fee transfer */ ],
    "type": "evm",
    "version": "1.0"
  }
}
```

**Before signing, compare `result.quote.minAmountOut` with the amount you baked into the steps.** They should be equal. If the returned value is _lower_, the quote moved between rounds 2 and 3 and the batch will not have enough token to cover `supply + fee`

> A `dry: false` create takes an **in-flight lock** per (intermediary, chain). A second create before the first reaches a terminal state returns `409` with `an execution for this wallet is already in progress. Wait for it to complete or fail before creating a new one`. So you get one shot per attempt: to retry with different numbers, cancel the execution first with `DELETE /api/v1/executions/{wallet}/{executionId}`. That call is not a bare DELETE — it needs a body carrying the wallet's signature over the literal string `delete_execution:{executionId}`.

### Sign and submit

`result.details.payload` is signed with the **origin wallet**, using `result.details.signingStandard` — your origin chain's standard, not the destination's. You never handle EVM calldata.

```http
POST /api/v1/executions/{wallet}/submit
```

```json
{
  "executionId": "33ca3807-0e1b-455f-a6dd-1a482ec9b385",
  "publicKey": "ed25519:BTKcXNp1wSzs9Mp2ejsPrHLr59z5UkEDJgqcWyXGhGc4",
  "signature": "ed25519:5VUXRtVgS6bq3Wn64YdCt5NSPfA1Ni5zqiLFsSScyq6Dj53pbNEcwKcp7t1aRqw8zWCoN7coMLBUmatmwLAEvndP"
}
```

The body is `{ signature, executionId }` for an EVM or Tron origin. An ed25519 origin (Solana, NEAR, Stellar) adds `publicKey`. A TON origin adds both `publicKey` and a `tonConnect` envelope. No `x-api-key` is needed here.

```json
{ "result": { "status": "SIGNED_PENDING_DEPOSIT" } }
```

Signing before the deposit is deliberate: the service holds the pre-signed batch and fires it the moment the bridge settles.

### Deposit and settle

1. **Transfer** to `result.quote.depositAddress`:
   * `EXACT_INPUT` — exactly `quote.amount` (`1270000` lamports here).
   * `EXACT_OUTPUT` — `result.quote.amountIn`, the origin commitment the service computed. Do not recompute it.
   * A Stellar origin must also attach `quote.depositMemo` or the bridge will not settle.
2.  **Record it** so 1Click is notified without waiting for a watcher:

    ```http
    POST /api/v1/executions/deposit/submit
    ```

    ```json
    { "txHash": "<origin tx hash>", "depositAddress": "81VBKaGXxy6chA9KjsiuLiAqiaNnsTvjRLe2DX1jYq9M" }
    ```

    MEMO-mode origins (Stellar) must include `"memo"` — the address alone does not identify the execution and the call answers `404` without it.
3.  **Poll** `GET /api/v1/executions/{wallet}?id={executionId}` until terminal. `result` is an **array**, so read `result[0]` even when filtering by a single id:

    ```
    CREATED → DEPOSIT_PENDING → DEPOSIT_PROCESSING →
    OPERATION_PENDING → OPERATION_PROCESSING → SUCCESS
    ```

    `DEPOSIT_FAILED` and `OPERATION_FAILED` are terminal. `EXPIRED` looks terminal but is not always: a deposit that settles late can revive the execution straight to `OPERATION_PROCESSING`.

After `SUCCESS` the intermediary holds aBasUSDC representing the supplied USDC plus accrued interest, redeemable later through an out-operation execution.

### EXACT\_INPUT vs EXACT\_OUTPUT

The steps are identical across swap types. What changes is what `quote.amount` means, how the fee is handled, and how much you deposit.

|                               | **EXACT\_INPUT**                                                                      | **EXACT\_OUTPUT**                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `quote.amount` denominated in | the **origin** token (what you send)                                                  | the **destination** token (what you want supplied)                                                   |
| What's fixed                  | the input you bridge                                                                  | the amount that ends up supplied (`≈ Y`)                                                             |
| Fee handling                  | the service carves the fee out of the quote's output, so you supply `delivered − fee` | the service **grosses the 1Click quote up** by the fee first, so after the carve you still net `≈ Y` |
| How much you deposit          | `quote.amount`, verbatim                                                              | `result.quote.amountIn` from the create response                                                     |
| Round-2 `quote.minAmountOut`  | gross output minus the fee                                                            | `≈ Y`                                                                                                |

* **EXACT\_INPUT** — "I'm sending 0.00127 SOL. Supply whatever survives fees."
* **EXACT\_OUTPUT** — "I want 87125 USDC supplied. Charge me whatever that costs." Read `result.quote.amountIn` from round 3 and deposit **that**.

Note that on `EXACT_OUTPUT` the gross-up happens only once a fee exists, so round 1 (no steps, no fee) reports a lower `amountIn` than round 3 does. Use the round-3 value for the deposit.

### Rules

* **`x-api-key` is required** on `POST /api/v1/executions/{wallet}` — every round, dry or not. It fetches a 1Click quote and prices per-key fees server-side. `POST …/submit` and `POST …/deposit/submit` do not take it.
* **`dry: false` requires steps.** An empty `steps` array is only valid on a dry round.
* **Do not add the fee step yourself.** The service appends it; a duplicate would double-charge the intermediary.
* **Step objects accept only `to`, `functionSignature`, `parameters`, `value` and `metadata`.** An unknown key, a differently cased spelling, or a duplicate is a `400`. Anything else you need to carry goes in `metadata`, which is passed through untouched.
* **`quote.recipient` is out-operation only.** On a bridge-in the recipient is always the intermediary; sending it is a `400`.
* **`{MIN_AMOUNT_OUT}` and the three-round flow are mutually exclusive in practice** — the placeholder is what you use _instead_ of computing the amount. Mixing them (a placeholder in one step, a literal in another) means the two steps operate on different amounts.

### Errors you will actually hit

| Response                                                                                                             | Cause                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `400 steps are required for non-dry executions`                                                                      | `dry: false` with an empty `steps` array.                                                                                                                          |
| `400 estimated gas fee exceeds minimum output amount`                                                                | the fee is larger than the quote's `minAmountOut` — the bridged amount is too small to pay for the batch. Send more.                                               |
| `400 estimated gas fee exceeds expected output amount`                                                               | same, against `amountOut`.                                                                                                                                         |
| `400 invalid steps JSON: …`                                                                                          | a malformed parameter, an out-of-range integer, a tuple arity mismatch, or a bad step key. The detail is appended, and per-step problems are prefixed `step <i>:`. |
| `409 an execution for this wallet is already in progress. Wait for it to complete or fail before creating a new one` | a previous `dry: false` create is still live. Wait for it, or delete it.                                                                                           |
| `401 missing or invalid api token`                                                                                   | absent or rejected `x-api-key`.                                                                                                                                    |
