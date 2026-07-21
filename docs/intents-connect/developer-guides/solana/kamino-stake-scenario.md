---
icon: book-open
---

# Kamino stake scenario

A worked, self-contained example of supplying USDC to a **Kamino Lending** reserve to earn yield. It covers **both** execution modes: **steps-only** (your Solana intermediary already holds the USDC) and **quote-with-steps** (bridge USDC in from another chain and supply it in one signed request).

Supplying is two instructions in one execution:

1. **`refresh_reserve`** — refresh the reserve's price so the deposit values your USDC correctly.
2. **`deposit_reserve_liquidity`** — move your USDC into the reserve and mint back **cUSDC** (the reserve's collateral receipt token) to your intermediary.

No borrowing and no obligation account are involved — this is the plain earn flow. You simply hold cUSDC afterwards and redeem it later to get your USDC back plus accrued interest (see Kamino withdraw).

### The two execution modes

The instructions above are identical in both modes. What differs is the endpoint, whether a `quote` and an API key are involved, and — crucially — **how the deposit amount is chosen**.

|                    | **steps-only**                                       | **quote-with-steps** (bridge-in)                                                   |
| ------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Endpoint           | `POST /api/v1/executions/{wallet}/steps`             | `POST /api/v1/executions/{wallet}`                                                 |
| `execution_mode`   | `steps_only`                                         | `quote_with_steps`                                                                 |
| Carries a `quote`  | no                                                   | yes                                                                                |
| `x-api-key` header | **not** required                                     | **required**                                                                       |
| Precondition       | intermediary already holds USDC                      | USDC is bridged in from the origin chain first                                     |
| Deposit amount     | a concrete `u64` you compute (see fee carving below) | the `{MIN_AMOUNT_OUT}` placeholder — the service fills the post-fee bridged amount |
| Swap type          | n/a (no quote)                                       | `EXACT_INPUT` or `EXACT_OUTPUT`                                                    |

Everything else — the request envelope, signing with your origin wallet, and the submit call — is the same as for any destination. For the conceptual overview see Using a Solana destination.

### Addresses (Kamino Main Market USDC reserve, Solana mainnet)

These are specific to the Kamino **Main Market USDC reserve**. A different token or market has a different account set.

| Account                               | Address                                        |
| ------------------------------------- | ---------------------------------------------- |
| Kamino Lending program                | `KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD`  |
| Lending market (Main Market)          | `7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF` |
| Lending market authority              | `9DrvZvyWh1HuAoZxvYWMvkf2XCzryCpGgHqrMjyDWpmo` |
| USDC reserve                          | `D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59` |
| USDC mint (reserve liquidity mint)    | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| Reserve liquidity supply (USDC vault) | `Bgq7trRgVMeq33yt235zM2onQ4bRDBsY5EWiTetF4qw6` |
| Reserve collateral mint (cUSDC)       | `B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D` |
| Reserve price oracle (Scope)          | `3t4JZcueEzTbVP6kLxXrL3VpWx45jDer4eqysweBchNH` |
| SPL Token program                     | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`  |
| Instructions sysvar                   | `Sysvar1nstructions1111111111111111111111111`  |

The two addresses you supply yourself are the intermediary's own token accounts:

* **`<intermediary USDC ATA>`** — the intermediary's associated token account for the USDC mint (the source of the USDC being deposited).
* **`<intermediary cUSDC ATA>`** — the intermediary's associated token account for the cUSDC mint (where the minted cUSDC lands). This usually does not exist before your first deposit. The service creates it for you inside the signed transaction and bills its one-time rent only if it was actually missing.

Derive each ATA from your resolved Solana intermediary and the relevant mint — a program-derived address of `[ intermediary, TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA, mint ]` under the associated-token-account program `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL`. Fetch the resolved intermediary from `GET /api/v1/executions/{wallet}/intermediary` → `result.solana`.

***

## Mode 1 — steps-only (intermediary already holds USDC)

### The steps

```jsonc
"steps": [
  {
    "metadata": { "name": "Refresh reserve", "description": "Refresh the Kamino USDC reserve price" },
    "programId": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
    "discriminator": "02da8aeb4fc91966",
    "args": [],
    "accounts": [
      { "pubkey": "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59", "isSigner": false, "isWritable": true  },
      { "pubkey": "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF", "isSigner": false, "isWritable": false },
      { "pubkey": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD", "isSigner": false, "isWritable": false },
      { "pubkey": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD", "isSigner": false, "isWritable": false },
      { "pubkey": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD", "isSigner": false, "isWritable": false },
      { "pubkey": "3t4JZcueEzTbVP6kLxXrL3VpWx45jDer4eqysweBchNH", "isSigner": false, "isWritable": false }
    ]
  },
  {
    "metadata": { "name": "Deposit into Kamino", "description": "Supply USDC, receive cUSDC" },
    "programId": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
    "discriminator": "a9c91e7e06cd6644",
    "args": [
      { "name": "liquidity_amount", "type": "u64", "value": "25000000" }   // 25 USDC (6 decimals)
    ],
    "accounts": [
      { "pubkey": "{INTERMEDIARY}",                                 "isSigner": true,  "isWritable": false },
      { "pubkey": "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",   "isSigner": false, "isWritable": true  },
      { "pubkey": "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",   "isSigner": false, "isWritable": false },
      { "pubkey": "9DrvZvyWh1HuAoZxvYWMvkf2XCzryCpGgHqrMjyDWpmo",   "isSigner": false, "isWritable": false },
      { "pubkey": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",   "isSigner": false, "isWritable": false },
      { "pubkey": "Bgq7trRgVMeq33yt235zM2onQ4bRDBsY5EWiTetF4qw6",   "isSigner": false, "isWritable": true  },
      { "pubkey": "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D",   "isSigner": false, "isWritable": true  },
      { "pubkey": "<intermediary USDC ATA>",                        "isSigner": false, "isWritable": true  },
      { "pubkey": "<intermediary cUSDC ATA>",                       "isSigner": false, "isWritable": true  },
      { "pubkey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",   "isSigner": false, "isWritable": false },
      { "pubkey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",   "isSigner": false, "isWritable": false },
      { "pubkey": "Sysvar1nstructions1111111111111111111111111",   "isSigner": false, "isWritable": false }
    ]
  }
]
```

### 1a. The single-request path (`dry: false`)

If you already know a concrete amount that leaves **enough USDC in the intermediary to cover the network fee** (see the fee note below), you don't need a preview — send **one** create request with `dry: false`:

```jsonc
POST /api/v1/executions/0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5/steps
{
  "version": "1.0",
  "type": "solana",
  "destinationAsset": "<destination asset id for USDC on Solana>",
  "steps": [ /* the two steps above, with liquidity_amount = 25000000 */ ],
  "dry": false
}
```

Then sign and submit (below). That is **one** create request (plus the universal `submit`). Use this when your deposit amount is a fixed figure and the intermediary holds comfortably more USDC than the fee.

### 1b. The three-request path (adjust the amount by the fee)

**Why you often can't send a fixed amount.** After your steps, the service appends its **own** fee instruction that debits the intermediary **in the destination token (USDC)** — SPL destinations settle via a gasless relayer (Kora) that pays the SOL gas and takes its fee in the destination token (the mint must be on the deployment's `kora_fee_token_mints` allow-list, or create returns `400`). So if you deposit your _entire_ USDC balance, nothing is left to pay the fee and the transaction fails. To supply "everything minus the fee" — or any amount close to your balance — you must first learn the fee, then reduce the deposit by it. This is exactly what the reference frontend does, in **three requests**:

1.  **Estimate** — a `dry: true` create. The response returns `result.details.networkFee`, the fee in USDC base units.

    ```jsonc
    POST /api/v1/executions/{wallet}/steps
    { "version": "1.0", "type": "solana", "destinationAsset": "…",
      "steps": [ /* liquidity_amount = your target amount, e.g. 25000000 */ ],
      "dry": true }
    ```

    ```jsonc
    // response
    { "result": { "details": { "networkFee": "40000" /* 0.04 USDC */ } } }
    ```
2.  **Adjust the amount in your steps.** Set the deposit step's `liquidity_amount` to `amount − networkFee` — the carved value the intermediary can actually supply while retaining the fee:

    ```
    liquidity_amount = 25000000 − 40000 = 24960000
    ```
3.  **Execute** — the same request with the carved amount and `dry: false`:

    ```jsonc
    POST /api/v1/executions/{wallet}/steps
    { "version": "1.0", "type": "solana", "destinationAsset": "…",
      "steps": [ /* liquidity_amount = 24960000 */ ],
      "dry": false }
    ```

The three requests are therefore **`dry:true` estimate → `dry:false` execute → `submit`** (step 4, below). The service injects the fee instruction into the signed transaction. You never add a fee step yourself — you only size your deposit so the intermediary keeps the fee behind.

> A `dry: true` preview echoes your submitted steps back unchanged. A real (`dry: false`) create instead returns the steps the service actually signs — with `{INTERMEDIARY}` resolved, the prepended cUSDC ATA create (when it was missing), and the appended fee instruction rendered generically (full instruction data as the `discriminator`, empty `args`).

***

## Mode 2 — quote-with-steps (bridge USDC in, then stake)

To bridge USDC in from another chain **and** supply it in a single signed request, use the quote-backed create endpoint. This is a **bridge-in** execution (`execution_mode = quote_with_steps`).

Two things change versus steps-only:

* The request carries a **`quote`** (origin asset, amount, destination asset, slippage, swap type, deadline) and **requires an `x-api-key` header**.
* The deposit step's `liquidity_amount` is the **`{MIN_AMOUNT_OUT}`** placeholder instead of a number. The service resolves it to the full **post-fee** bridged amount server-side — you never carve the fee yourself and you cannot know the exact figure up front. (`{MIN_AMOUNT_OUT}` is bridge-in only. It is rejected in steps-only.)

```jsonc
POST /api/v1/executions/0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5
// header: x-api-key: <your key>
{
  "version": "1.0",
  "type": "solana",
  "quote": {
    "originAsset": "<1click origin asset id, e.g. USDC on Base>",
    "amount": "25000000",
    "destinationAsset": "<1click asset id for USDC on Solana>",
    "slippageTolerance": 100,          // basis points (1%)
    "swapType": "EXACT_INPUT",
    "deadline": "2026-07-17T12:00:00Z"
  },
  "steps": [
    { /* refresh_reserve — identical to Mode 1 */ },
    {
      "programId": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
      "discriminator": "a9c91e7e06cd6644",
      "args": [
        { "name": "liquidity_amount", "type": "u64", "value": "{MIN_AMOUNT_OUT}" }
      ],
      "accounts": [ /* identical to Mode 1 */ ]
    }
  ],
  "metadata": { "title": "Stake to Kamino", "intent": "kamino_stake" },
  "dry": false
}
```

This is a **single** `dry: false` create request. (A `dry: true` preflight is optional. It returns a best-effort `result.details.networkFee` plus a fee-adjusted amount preview, but for an SPL destination that fee is only advisory — the authoritative fee is computed and carved from `{MIN_AMOUNT_OUT}` at execution time, so the dry round does not fix your exact deposited amount.)

#### EXACT\_INPUT vs EXACT\_OUTPUT

The **steps are identical** across swap types — the only differences are the `quote.swapType`/`quote.amount` fields and how much you deposit to the returned deposit address. `{AMOUNT_IN}` is **out-op only** and is rejected on a bridge-in.

|                               | **EXACT\_INPUT**                                                                          | **EXACT\_OUTPUT**                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `quote.amount` denominated in | the **origin** token (what you send)                                                      | the **destination** USDC (what you want staked)                                                              |
| What's fixed                  | the input you bridge                                                                      | the USDC that ends up supplied (`≈ Y`)                                                                       |
| Fee handling                  | the service carves the network fee out of `{MIN_AMOUNT_OUT}`, so you stake `input − fees` | the service **grosses the 1Click quote up** by the network fee first, so after the carve you still net `≈ Y` |
| How much you deposit          | the amount you set (per-chain atomic units)                                               | `result.quote.amountIn` — the origin commitment the service computes (already atomic, origin-token units)    |

* **EXACT\_INPUT** — "I'm sending 25 USDC from Base. Stake whatever arrives after fees." `quote.amount` is the origin amount. You deposit exactly that.
* **EXACT\_OUTPUT** — "I want 25 USDC supplied to Kamino. Charge me whatever that costs." `quote.amount` is the destination target `Y`. Read `result.quote.amountIn` from the create response and deposit **that** to the deposit address.

#### Bridge-in lifecycle (what follows the create)

1. **Create** (above) returns `result.quote.depositAddress` (and `depositMemo` for memo-mode origins), plus a signing `payload` in `result.details` for the action intent.
2. **Sign the intent** with your origin wallet and **submit** it (the service can pre-sign the Kamino transaction so it fires the moment the deposit confirms).
3. **Deposit** to `depositAddress` — the origin amount for EXACT\_INPUT, or `result.quote.amountIn` for EXACT\_OUTPUT — and record it with `POST /api/v1/executions/deposit/submit`.
4. The bridge settles to your Solana intermediary and the pre-signed Kamino transaction executes.

> **Bridge-in risk.** A bridge-in skips the pre-sign simulation guard (the funds arrive \~150 s after signing), so an action that reverts on-chain after signing burns the durable nonce and strands the bridged USDC in the intermediary (recoverable later via a steps-only execution). Keep the action comfortably under the 200000 compute-unit budget — this two-instruction deposit is well within it.

***

### Notes on the accounts

* **The three repeated `KLend…` entries in `refresh_reserve`** are the unused Pyth / Switchboard oracle slots. Kamino's convention is to pass the program's own id for an oracle the reserve does not use. The USDC reserve is priced by **Scope**, so only the last oracle slot (`3t4J…`) is a real account.
* **`deposit_reserve_liquidity` account order is fixed by the program.** The order shown — owner, reserve, market, market authority, liquidity mint, liquidity supply, collateral mint, source liquidity, destination collateral, then two token-program slots and the instructions sysvar — must be preserved. The two trailing token-program slots are the collateral and liquidity token programs (both the legacy SPL Token program for USDC).
* **`{INTERMEDIARY}` is the deposit owner and the only signer.**
* **`<intermediary USDC ATA>`** is the source liquidity account. **`<intermediary cUSDC ATA>`** is the destination collateral account.

### Discriminators

Both are Anchor 8-byte discriminators — the first 8 bytes of `sha256("global:" + instruction_name)`:

| Instruction                 | Discriminator      |
| --------------------------- | ------------------ |
| `refresh_reserve`           | `02da8aeb4fc91966` |
| `deposit_reserve_liquidity` | `a9c91e7e06cd6644` |

### Amount

`liquidity_amount` is in USDC base units (6 decimals): `25000000` = 25 USDC.

* **steps-only:** a concrete number. Either send it directly (Mode 1a) or carve it down to `amount − networkFee` after a dry estimate (Mode 1b).
* **quote-with-steps:** the `{MIN_AMOUNT_OUT}` placeholder — the service fills the post-fee bridged amount, which you cannot know up front.

### Rules that apply here

* **Only `{INTERMEDIARY}` may be a signer.**
* **Do not add compute-budget, nonce, or fee instructions** — the service injects those. A `dry: true` preview omits those injected instructions. A steps-only echo is otherwise your submitted steps verbatim, while a bridge-in echo additionally resolves `{MIN_AMOUNT_OUT}` to its post-fee value. A real create returns the exact transaction the service signs (resolved `{INTERMEDIARY}`, the prepended cUSDC ATA create when it was missing, and the appended fee instruction).
* **Stay within the limits.** The service injects a compute-unit budget (200000 by default, set by the deployment) covering all your steps together, and the assembled transaction must be ≤ **1232 bytes**. This two-instruction deposit fits comfortably under both.
* **A steps-only SPL action must touch its destination token** — the deposit references the intermediary's USDC ATA, so the requirement is satisfied.

### Sign and submit

The create response returns, under `result.details`, a `payload` to sign and a `signingStandard` — **your origin wallet's** standard. Sign `result.details.payload` with your origin wallet exactly as for any destination — you never handle the inner Solana message — then submit the signature:

```
POST /api/v1/executions/{wallet}/submit
```

The submit body is `{ signature, executionId }` for an EVM or Tron origin. An ed25519 origin (Solana, NEAR, or Stellar) must also include `publicKey`. A TON origin includes both `publicKey` and a `tonConnect` envelope, so its body is `{ signature, executionId, publicKey, tonConnect }`.

After it settles, your intermediary holds cUSDC representing the supplied USDC plus accrued interest, which you can redeem later.
