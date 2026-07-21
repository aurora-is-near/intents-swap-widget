---
icon: book-open
---

# Kamino withdraw scenario

A worked, self-contained example of withdrawing from a **Kamino Lending** reserve — burning the **cUSDC** you received when you supplied USDC, and getting your USDC back plus accrued interest. It covers **both** execution modes: **steps-only** (the redeemed USDC stays in your Solana intermediary) and **quote-with-steps** as an **out-operation** (redeem on Solana, then bridge the USDC out to another chain in one signed request).

Withdrawing is the mirror of supplying:

1. **`refresh_reserve`** — refresh the reserve's price so the redemption values your cUSDC correctly.
2. **`redeem_reserve_collateral`** — burn your cUSDC and return the underlying USDC (plus accrued interest) to your intermediary.

For an out-operation a third **producer transfer** step moves the redeemed USDC to the 1Click deposit address that bridges it out.

> **The account order in `redeem_reserve_collateral` differs from the deposit.** The lending market comes **before** the reserve, and the two token accounts swap roles (cUSDC is now the source, USDC the destination). Preserve the order shown.

### The two execution modes

The `refresh` + `redeem` pair is identical in both modes. What differs is the endpoint, whether a `quote`/API key is involved, and whether a producer transfer bridges the proceeds out.

|                          | **steps-only**                           | **quote-with-steps** (out-operation)                                             |
| ------------------------ | ---------------------------------------- | -------------------------------------------------------------------------------- |
| Endpoint                 | `POST /api/v1/executions/{wallet}/steps` | `POST /api/v1/executions/{wallet}` + `"outOperation": true`                      |
| `execution_mode`         | `steps_only`                             | `quote_with_steps`                                                               |
| Carries a `quote`        | no                                       | yes                                                                              |
| `x-api-key` header       | **not** required                         | **required**                                                                     |
| What happens to the USDC | stays in the intermediary's USDC account | a producer step transfers it to the 1Click deposit address, which bridges it out |
| Extra step               | none                                     | producer `transfer_checked` → `{DEPOSIT_ADDRESS}`                                |
| Swap type                | n/a (no quote)                           | `EXACT_INPUT` or `EXACT_OUTPUT`                                                  |

Everything else — the request envelope, signing with your origin wallet, and the submit call — is the same as for any destination. For the conceptual overview see Using a Solana destination.

### Addresses (Kamino Main Market USDC reserve, Solana mainnet)

These are the same accounts as the corresponding supply flow (Kamino stake). Only the instruction and account order change.

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

* **`<intermediary cUSDC ATA>`** — the source, the cUSDC being burned.
* **`<intermediary USDC ATA>`** — the destination, where the redeemed USDC lands.

Derive each ATA from your resolved Solana intermediary and the relevant mint — a program-derived address of `[ intermediary, TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA, mint ]` under the associated-token-account program `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL`. Fetch the resolved intermediary from `GET /api/v1/executions/{wallet}/intermediary` → `result.solana`.

***

## Mode 1 — steps-only (redeem into the intermediary)

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
    "metadata": { "name": "Withdraw from Kamino", "description": "Burn cUSDC, receive USDC" },
    "programId": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
    "discriminator": "ea75b57db98edc1d",
    "args": [
      { "name": "collateral_amount", "type": "u64", "value": "24500000" }   // cUSDC base units to redeem
    ],
    "accounts": [
      { "pubkey": "{INTERMEDIARY}",                                 "isSigner": true,  "isWritable": false },
      { "pubkey": "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF",   "isSigner": false, "isWritable": false },
      { "pubkey": "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",   "isSigner": false, "isWritable": true  },
      { "pubkey": "9DrvZvyWh1HuAoZxvYWMvkf2XCzryCpGgHqrMjyDWpmo",   "isSigner": false, "isWritable": false },
      { "pubkey": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",   "isSigner": false, "isWritable": false },
      { "pubkey": "B8V6WVjPxW1UGwVDfxH2d2r8SyT4cqn7dQRK6XneVa7D",   "isSigner": false, "isWritable": true  },
      { "pubkey": "Bgq7trRgVMeq33yt235zM2onQ4bRDBsY5EWiTetF4qw6",   "isSigner": false, "isWritable": true  },
      { "pubkey": "<intermediary cUSDC ATA>",                       "isSigner": false, "isWritable": true  },
      { "pubkey": "<intermediary USDC ATA>",                        "isSigner": false, "isWritable": true  },
      { "pubkey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",   "isSigner": false, "isWritable": false },
      { "pubkey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",   "isSigner": false, "isWritable": false },
      { "pubkey": "Sysvar1nstructions1111111111111111111111111",   "isSigner": false, "isWritable": false }
    ]
  }
]
```

### 1a. The single-request path (`dry: false`)

If you're redeeming a concrete cUSDC amount and the redemption yields comfortably more USDC than the network fee, send **one** create request with `dry: false`:

```jsonc
POST /api/v1/executions/0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5/steps
{
  "version": "1.0",
  "type": "solana",
  "destinationAsset": "<destination asset id for USDC on Solana>",
  "steps": [ /* the two steps above, with collateral_amount = 24500000 */ ],
  "dry": false
}
```

Then sign and submit (below). That is **one** create request (plus the universal `submit`).

### 1b. Making sure the fee is covered

After your steps, the service appends its **own** fee instruction that debits the intermediary **in USDC** (the destination token). Unlike a deposit, a redeem _produces_ USDC and the fee is taken **from that same redeemed USDC** — so you do **not** subtract the fee from `collateral_amount`. (`collateral_amount` is a cUSDC amount, and shrinking it would shrink the USDC the redeem yields, i.e. shrink the balance the fee is paid from.) Just make sure the redemption yields more USDC than the fee. A full-position redeem normally does. Against a very thin position, redeem _more_, not less.

To see the fee up front, send a `dry: true` create — it returns `result.details.networkFee` (USDC base units):

```jsonc
POST /api/v1/executions/{wallet}/steps
{ "version": "1.0", "type": "solana", "destinationAsset": "…",
  "steps": [ /* collateral_amount = the cUSDC you want to redeem */ ],
  "dry": true }
```

```jsonc
// response
{ "result": { "details": { "networkFee": "40000" /* 0.04 USDC */ } } }
```

Then execute the same request with `dry: false` and submit (step 4, below). You never add a fee step yourself — the service injects it.

> A `dry: true` preview echoes your submitted steps back unchanged. A real (`dry: false`) create returns the steps the service actually signs — resolved `{INTERMEDIARY}`, any prepended ATA create, and the appended fee instruction rendered generically (full instruction data as the `discriminator`, empty `args`).

***

## Mode 2 — quote-with-steps (redeem, then bridge USDC out)

To redeem your cUSDC on Solana **and** bridge the resulting USDC out to another chain in a single signed request, use the quote-backed create endpoint with `"outOperation": true`. This is a Solana **out-operation** (`execution_mode = quote_with_steps`): the action runs on Solana and its output is bridged out. There is **no deposit phase** — you sign the action at creation.

Two things change versus steps-only:

* The request carries a **`quote`** and \*\*requires an `x-api-key` header`**, plus the top-level` "outOperation": true\`.
* A third **producer transfer** step moves the redeemed USDC to the 1Click deposit address. Its destination is the **`{DEPOSIT_ADDRESS}`** placeholder (out-op only) and its amount is a placeholder the service resolves (see the swap-type table).

```jsonc
POST /api/v1/executions/0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5
// header: x-api-key: <your key>
{
  "version": "1.0",
  "type": "solana",
  "outOperation": true,
  "quote": {
    "originAsset": "<1click asset id for USDC on Solana>",
    "amount": "24500000",
    "destinationAsset": "<1click destination asset id, e.g. USDC on Base>",
    "slippageTolerance": 100,          // basis points (1%)
    "swapType": "EXACT_INPUT",
    "deadline": "2026-07-17T12:00:00Z",
    "recipient": "<optional destination-chain recipient>"
  },
  "steps": [
    { /* refresh_reserve — identical to Mode 1 */ },
    { /* redeem_reserve_collateral — identical to Mode 1, collateral_amount = the cUSDC to redeem */ },
    {
      "metadata": { "name": "Transfer to deposit address", "description": "Send redeemed USDC to the 1Click bridge" },
      "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "discriminator": "0c",                                    // TransferChecked
      "args": [
        // EXACT_INPUT: send any u64 (e.g. the amount you're redeeming) — the service
        // overwrites it with quote.amount − networkFee. EXACT_OUTPUT: send the
        // literal "{AMOUNT_IN}" placeholder instead.
        { "name": "amount",   "type": "u64", "value": "24500000" },
        { "name": "decimals", "type": "u8",  "value": 6 }
      ],
      "accounts": [
        { "pubkey": "<intermediary USDC ATA>",                     "isSigner": false, "isWritable": true  },  // source
        { "pubkey": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "isSigner": false, "isWritable": false }, // USDC mint
        { "pubkey": "{DEPOSIT_ADDRESS}",                            "isSigner": false, "isWritable": true  }, // 1Click deposit
        { "pubkey": "{INTERMEDIARY}",                              "isSigner": true,  "isWritable": false }   // authority
      ]
    }
  ],
  "metadata": { "title": "Withdraw from Kamino (cross-chain)", "intent": "kamino_withdraw" },
  "dry": false
}
```

This is a **single** `dry: false` create request. The out-op signs at creation and there is no separate deposit transfer.

#### EXACT\_INPUT vs EXACT\_OUTPUT

The redeem's `collateral_amount` is always the cUSDC you burn. What changes is the **producer transfer's amount placeholder** and what `quote.amount` means:

|                               | **EXACT\_INPUT**                                                                                                                                                                                                   | **EXACT\_OUTPUT**                                                                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `quote.amount` denominated in | the **origin** USDC on Solana (what you redeem/bridge)                                                                                                                                                             | the **destination** token on the far chain (what you want to receive)                                                                                                                                  |
| Producer amount value         | a concrete `u64` (overwritten)                                                                                                                                                                                     | the `{AMOUNT_IN}` placeholder (overwritten)                                                                                                                                                            |
| Who sets the producer amount  | you send any `u64` — the service **overwrites** it with a deterministic `quote.amount − networkFee` (known up front). Ensure the redeem yields at least `quote.amount`, or the pre-sign simulation reverts (`400`) | `{AMOUNT_IN}` substitutes to `quote.amountIn + network fee`, but the producer amount is then overwritten to `quote.amountIn` (the fee is a separate injected transfer). 1Click refunds unused slippage |
| What's fixed                  | the USDC you bridge out                                                                                                                                                                                            | the amount received on the destination chain (`≈ Y`)                                                                                                                                                   |

* **`{DEPOSIT_ADDRESS}`** is out-op only. For this SPL producer it substitutes to the 1Click deposit address's **associated token account** for the mint (the service also prepends a `CreateIdempotent` to provision it) — not the raw deposit wallet. (For a native-SOL producer it substitutes to the bare deposit wallet.)
* **`{AMOUNT_IN}`** is valid **only** for an out-operation with `swapType = EXACT_OUTPUT`. Using it anywhere else is a `400`.
* For **EXACT\_INPUT**, put any `u64` in the producer amount (e.g. the amount you're redeeming). The service overwrites it server-side with `quote.amount − networkFee` (a deterministic value, known up front — not the redeem's actual on-chain output), so size the redeem to yield at least `quote.amount`. **There is no `{amount}` sentinel on the wire** — the only backend placeholders are `{INTERMEDIARY}`, `{MIN_AMOUNT_OUT}`, `{DEPOSIT_ADDRESS}`, and `{AMOUNT_IN}`. (The reference frontend uses an `{amount}` editor placeholder but resolves it to a concrete number before POSTing.)

#### Out-operation lifecycle (what follows the create)

1. **Create** (above) returns a signing `payload` in `result.details`.
2. **Sign** it with your origin wallet and **submit** the signature. The out-operation executes on Solana (redeem + producer transfer), the producer transfer funds the 1Click deposit address, and 1Click bridges the USDC out to the destination chain. There is no deposit for you to send.

***

### Notes on the accounts

* **The three repeated `KLend…` entries in `refresh_reserve`** are the unused Pyth / Switchboard oracle slots — the same as in the supply flow. The USDC reserve is Scope-priced, so only the last slot (`3t4J…`) is a real account.
* **`redeem_reserve_collateral` account order:** owner, **lending market**, **reserve**, market authority, reserve liquidity mint, **reserve collateral mint**, **reserve liquidity supply**, source collateral (cUSDC), destination liquidity (USDC), then the two token-program slots and the instructions sysvar. This differs from the deposit order — do not reuse the deposit account list.
* **`{INTERMEDIARY}` is the only signer** — in every step, including the producer transfer's authority.
* **`<intermediary cUSDC ATA>`** is the source collateral account (burned). **`<intermediary USDC ATA>`** is the destination liquidity account (received) and the producer transfer's source.

### Discriminators

Anchor 8-byte discriminators (first 8 bytes of `sha256("global:" + name)`), plus the SPL Token opcode for the producer transfer:

| Instruction                            | Discriminator      |
| -------------------------------------- | ------------------ |
| `refresh_reserve`                      | `02da8aeb4fc91966` |
| `redeem_reserve_collateral`            | `ea75b57db98edc1d` |
| SPL Token `TransferChecked` (producer) | `0c`               |

### Amount

`collateral_amount` is in **cUSDC** base units — the amount of collateral token to burn, not the USDC you expect back. Because cUSDC accrues value against USDC, redeeming your full cUSDC balance returns slightly more USDC than you originally deposited.

* **steps-only:** a concrete cUSDC number. Send it directly (Mode 1a). Optionally preview the fee first (Mode 1b) to confirm the redeem yields more USDC than the fee. To redeem everything, use your intermediary's full cUSDC balance.
* **quote-with-steps (out-op):** the redeem `collateral_amount` is still the cUSDC to burn. The **producer** amount is either a concrete `u64` (EXACT\_INPUT, which the service overwrites to `quote.amount − networkFee`) or the `{AMOUNT_IN}` placeholder (EXACT\_OUTPUT). `{amount}` is only the reference frontend's editor sentinel, resolved to a number before POST — it is not a backend placeholder.

### Rules that apply here

* **Only `{INTERMEDIARY}` may be a signer.**
* **Do not add compute-budget, nonce, or fee instructions** — the service injects those. Your steps are echoed back **untouched** in a `dry: true` preview. A real create returns the exact transaction the service signs (resolved `{INTERMEDIARY}`, any prepended ATA create, the appended fee instruction, and — for an out-op — the resolved `{DEPOSIT_ADDRESS}` / producer amount).
* **Stay within the limits.** The service injects a compute-unit budget (200000 by default, set by the deployment) covering all your steps together, and the assembled transaction must be ≤ **1232 bytes**. This withdraw fits comfortably under both.
* **A steps-only SPL action must touch its destination token** — the redemption references the intermediary's USDC ATA (the destination mint), so the requirement is satisfied.
* **SPL destinations settle via a gasless relayer (Kora)** that pays the SOL gas and takes the network fee in the destination token. The mint must be on the deployment's `kora_fee_token_mints` allow-list, or create returns `400`.

### Sign and submit

The create response returns, under `result.details`, a `payload` to sign and a `signingStandard` — **your origin wallet's** standard. Sign `result.details.payload` with your origin wallet exactly as for any destination — you never handle the inner Solana message — then submit the signature:

```
POST /api/v1/executions/{wallet}/submit
```

The submit body is `{ signature, executionId }` for an EVM or Tron origin. An ed25519 origin (Solana, NEAR, or Stellar) must also include `publicKey`. A TON origin includes both `publicKey` and a `tonConnect` envelope, so its body is `{ signature, executionId, publicKey, tonConnect }`.

After it settles, the cUSDC is burned and — for steps-only — your intermediary holds the redeemed USDC. For an out-operation the USDC has been bridged out to the destination chain.
