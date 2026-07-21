---
icon: book-open
---

# Native SOL scenario

A worked, self-contained guide to acting on **native SOL** — as opposed to an SPL token like USDC. It covers a plain **SOL transfer**, and staking/unstaking native SOL through the **Jito SPL Stake Pool** (native SOL in, native SOL out, minting and burning the **jitoSOL** liquid-staking token). Each example is shown in **both** execution modes: **steps-only** (the intermediary already holds SOL / jitoSOL) and **quote-with-steps** (bridge SOL in, or bridge the proceeds out, in one signed request).

### How native SOL differs from an SPL token

Native SOL is not an SPL token, and several rules change because of it:

* **No token account.** SOL lives directly in the account's lamport balance — there is no associated token account (ATA) to derive or create. SOL is moved with an explicit **System `Transfer`** instruction (`programId` `11111111111111111111111111111111`, discriminator `02000000`, a `u64` `lamports` arg, accounts `[from, to]`). There is no `value`/lamports field on a step.
* **No wrapping.** The service does **not** wrap SOL into wrapped-SOL. The Jito stake pool takes native SOL in and out directly, which is why it — not a wrapped-SOL Kamino reserve — backs the native flow here.
* **9 decimals.** 1 SOL = `1000000000` lamports. (jitoSOL, an SPL token, also has 9 decimals.)
* **The network fee is charged in native SOL** (lamports), debited from the intermediary — see Fees and the rent reserve.
* **Exempt from the "must touch the destination token" guard.** A steps-only SPL destination must include a step referencing the dest mint or its ATA. A native-SOL destination has no mint, so this check does not apply.
* **The liquid-staking token&#x20;**_**is**_**&#x20;an SPL token.** jitoSOL is a normal SPL token, so the intermediary's **jitoSOL ATA** is a real ATA the service creates in-message if it's missing (billing its one-time rent only when it was). Only the SOL side needs no account.

Everything else — the request envelope, signing with your origin wallet, and the submit call — is the same as for any destination. For the conceptual overview and the two-mode contrast (steps-only vs quote-with-steps), see Using a Solana destination. The mechanics mirror Kamino stake and Kamino withdraw.

### Addresses (Jito SPL Stake Pool, Solana mainnet)

Read off-chain 2026-07. The stake-pool accounts are specific to the Jito pool. The programs and sysvars are network constants.

| Account                       | Address                                        |
| ----------------------------- | ---------------------------------------------- |
| SPL Stake Pool program        | `SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy`  |
| Stake pool (Jito)             | `Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb`  |
| Pool withdraw authority (PDA) | `6iQKfEyhr3bZMotVkW6beNZz5CPAkiwvgV2CTje9pVSS` |
| Reserve stake account         | `BgKUXdS29YcHCFrPm5M8oLHiTzZaMDjsebggjoaQ6KFL` |
| Pool mint (jitoSOL)           | `J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn` |
| Manager fee account           | `8yoigZfzZ1nNaadumY9uPVD118225UYHTDpmjpr2nrSa` |
| System program                | `11111111111111111111111111111111`             |
| Stake program                 | `Stake11111111111111111111111111111111111111`  |
| Clock sysvar                  | `SysvarC1ock11111111111111111111111111111111`  |
| Stake history sysvar          | `SysvarStakeHistory1111111111111111111111111`  |
| SPL Token program             | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`  |

The one address you supply yourself for the stake-pool flows is:

* **`<intermediary jitoSOL ATA>`** — the intermediary's associated token account for the jitoSOL pool mint. Derive it from your resolved Solana intermediary and the pool mint (a PDA of `[ intermediary, TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA, J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn ]` under `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL`). Fetch the resolved intermediary from `GET /api/v1/executions/{wallet}/intermediary` → `result.solana`.

The SPL Stake Pool discriminators are single-byte Borsh enum variant indices:

| Instruction       | Variant | Discriminator |
| ----------------- | ------- | ------------- |
| `DepositSol`      | 14      | `0e`          |
| `WithdrawSol`     | 16      | `10`          |
| System `Transfer` | —       | `02000000`    |

`DepositSol`'s sol-deposit authority and `WithdrawSol`'s sol-withdraw authority are both `None` (permissionless) on this pool, so the optional trailing authority account is omitted from both instructions.

***

## Example A — transfer native SOL (steps-only)

Moving SOL out of the intermediary is a single System `Transfer`. No ATA, no create step — the recipient is a plain wallet address.

```jsonc
POST /api/v1/executions/0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5/steps
{
  "version": "1.0",
  "type": "solana",
  "destinationAsset": "<destination asset id for native SOL>",
  "steps": [
    {
      "metadata": { "name": "Transfer SOL", "description": "Send 0.5 SOL to the recipient" },
      "programId": "11111111111111111111111111111111",
      "discriminator": "02000000",
      "args": [
        { "name": "lamports", "type": "u64", "value": "500000000" }   // 0.5 SOL (9 decimals)
      ],
      "accounts": [
        { "pubkey": "{INTERMEDIARY}",   "isSigner": true,  "isWritable": true },   // from (only signer)
        { "pubkey": "<recipient wallet>", "isSigner": false, "isWritable": true }  // to
      ]
    }
  ],
  "dry": false
}
```

That's **one** create request (plus `submit`). Because the fee is charged in SOL, keep an amount that leaves the intermediary with the fee plus its rent-exempt minimum — or use the three-request carve (Example B, step 1b) to size it exactly.

***

## Example B — stake native SOL (Jito `DepositSol`)

`DepositSol` takes native SOL from the intermediary and mints **jitoSOL** into the intermediary's jitoSOL ATA. A single instruction — no `refresh`, no lookup tables.

### The step

```jsonc
{
  "metadata": { "name": "Deposit SOL to Jito", "description": "Stake native SOL, receive jitoSOL" },
  "programId": "SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy",
  "discriminator": "0e",
  "args": [
    { "name": "lamports", "type": "u64", "value": "500000000" }   // 0.5 SOL
  ],
  "accounts": [
    { "pubkey": "Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb", "isSigner": false, "isWritable": true  },  // stake pool
    { "pubkey": "6iQKfEyhr3bZMotVkW6beNZz5CPAkiwvgV2CTje9pVSS", "isSigner": false, "isWritable": false },  // withdraw authority
    { "pubkey": "BgKUXdS29YcHCFrPm5M8oLHiTzZaMDjsebggjoaQ6KFL", "isSigner": false, "isWritable": true  },  // reserve stake
    { "pubkey": "{INTERMEDIARY}",                               "isSigner": true,  "isWritable": true  },  // funding SOL (only signer)
    { "pubkey": "<intermediary jitoSOL ATA>",                   "isSigner": false, "isWritable": true  },  // destination pool token
    { "pubkey": "8yoigZfzZ1nNaadumY9uPVD118225UYHTDpmjpr2nrSa", "isSigner": false, "isWritable": true  },  // manager fee account
    { "pubkey": "<intermediary jitoSOL ATA>",                   "isSigner": false, "isWritable": true  },  // referral (no referrer → user pool ATA)
    { "pubkey": "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", "isSigner": false, "isWritable": true  },  // pool mint (jitoSOL)
    { "pubkey": "11111111111111111111111111111111",            "isSigner": false, "isWritable": false },  // system program
    { "pubkey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "isSigner": false, "isWritable": false }   // SPL token program
  ]
}
```

### Mode 1 — steps-only (intermediary already holds SOL)

#### 1a. Single-request path (`dry: false`)

If the amount leaves the intermediary with enough SOL for the fee (and rent), send one `dry: false` create with `lamports` set to a concrete value:

```jsonc
POST /api/v1/executions/{wallet}/steps
{ "version": "1.0", "type": "solana", "destinationAsset": "<native SOL asset id>",
  "steps": [ /* the DepositSol step above, lamports = 500000000 */ ],
  "dry": false }
```

#### 1b. Three-request path (adjust the amount by the fee)

To stake close to your whole balance you must leave SOL for the appended fee (and the rent-exempt minimum). Learn the fee, carve the amount, then execute — three requests:

1.  **Estimate** — `dry: true` create returns `result.details.networkFee` (lamports):

    ```jsonc
    POST /api/v1/executions/{wallet}/steps
    { "version": "1.0", "type": "solana", "destinationAsset": "<native SOL asset id>",
      "steps": [ /* lamports = your target, e.g. 500000000 */ ], "dry": true }
    ```

    ```jsonc
    { "result": { "details": { "networkFee": "15000" } } }
    ```
2. **Adjust** `lamports` to `amount − networkFee` (and keep the rent-exempt reserve — see below): `500000000 − 15000 = 499985000`.
3. **Execute** the same request with the carved `lamports` and `dry: false`.

The three requests are **`dry:true` estimate → `dry:false` execute → `submit`**.

### Mode 2 — quote-with-steps (bridge SOL in, then stake)

Bridge SOL in from another chain and stake it in one signed request via the quote-backed create endpoint (**requires `x-api-key`**). Set `lamports` to the **`{MIN_AMOUNT_OUT}`** placeholder — the service fills the post-fee bridged amount (after also reserving the rent-exempt minimum for native SOL). This is a bridge-in (`execution_mode = quote_with_steps`).

```jsonc
POST /api/v1/executions/{wallet}
// header: x-api-key: <your key>
{
  "version": "1.0",
  "type": "solana",
  "quote": {
    "originAsset": "<1click origin asset id, e.g. ETH on Base>",
    "amount": "500000000",
    "destinationAsset": "<1click asset id for native SOL>",
    "slippageTolerance": 100,
    "swapType": "EXACT_INPUT",
    "deadline": "2026-07-17T12:00:00Z"
  },
  "steps": [
    {
      "programId": "SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy",
      "discriminator": "0e",
      "args": [ { "name": "lamports", "type": "u64", "value": "{MIN_AMOUNT_OUT}" } ],
      "accounts": [ /* identical to the DepositSol step above */ ]
    }
  ],
  "dry": false
}
```

**EXACT\_INPUT vs EXACT\_OUTPUT** — the step is identical. Only `quote.swapType` / `quote.amount` and the deposit differ (`{AMOUNT_IN}` is out-op only and rejected on a bridge-in):

* **EXACT\_INPUT** — `quote.amount` is the origin token you send. You deposit exactly that. The service stakes `arrived − fees`.
* **EXACT\_OUTPUT** — `quote.amount` is the native SOL you want staked (`≈ Y`). The service grosses the quote up by the fee, and you deposit `result.quote.amountIn` (origin-token atomic units) to the returned deposit address.

***

## Example C — unstake to native SOL (Jito `WithdrawSol`)

`WithdrawSol` burns jitoSOL from the intermediary's jitoSOL ATA and returns native SOL to the intermediary. Note the account order differs from `DepositSol` and the intermediary appears **twice** — once as the burn authority, once as the lamport recipient.

### The step

```jsonc
{
  "metadata": { "name": "Withdraw SOL from Jito", "description": "Burn jitoSOL, receive native SOL" },
  "programId": "SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy",
  "discriminator": "10",
  "args": [
    { "name": "poolTokens", "type": "u64", "value": "500000000" }   // jitoSOL base units to burn
  ],
  "accounts": [
    { "pubkey": "Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb", "isSigner": false, "isWritable": true  },  // stake pool
    { "pubkey": "6iQKfEyhr3bZMotVkW6beNZz5CPAkiwvgV2CTje9pVSS", "isSigner": false, "isWritable": false },  // withdraw authority
    { "pubkey": "{INTERMEDIARY}",                               "isSigner": true,  "isWritable": false },  // transfer authority (only signer)
    { "pubkey": "<intermediary jitoSOL ATA>",                   "isSigner": false, "isWritable": true  },  // burn pool token from here
    { "pubkey": "BgKUXdS29YcHCFrPm5M8oLHiTzZaMDjsebggjoaQ6KFL", "isSigner": false, "isWritable": true  },  // reserve stake
    { "pubkey": "{INTERMEDIARY}",                               "isSigner": false, "isWritable": true  },  // receives lamports
    { "pubkey": "8yoigZfzZ1nNaadumY9uPVD118225UYHTDpmjpr2nrSa", "isSigner": false, "isWritable": true  },  // manager fee account
    { "pubkey": "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", "isSigner": false, "isWritable": true  },  // pool mint (jitoSOL)
    { "pubkey": "SysvarC1ock11111111111111111111111111111111", "isSigner": false, "isWritable": false },  // clock sysvar
    { "pubkey": "SysvarStakeHistory1111111111111111111111111", "isSigner": false, "isWritable": false },  // stake history sysvar
    { "pubkey": "Stake11111111111111111111111111111111111111", "isSigner": false, "isWritable": false },  // stake program
    { "pubkey": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "isSigner": false, "isWritable": false }   // SPL token program
  ]
}
```

### Mode 1 — steps-only

Same shape as Example B, Mode 1: one `dry: false` create for a concrete `poolTokens`, or the three-request `dry:true → dry:false → submit` carve when you need to size against the fee. The redeemed SOL lands in the intermediary.

### Mode 2 — quote-with-steps (unstake, then bridge SOL out)

To unstake **and** bridge the SOL out to another chain, use the quote-backed create endpoint with `"outOperation": true`. A second **producer** step — a native System `Transfer` — sends the withdrawn SOL to the 1Click deposit address (a bare wallet for native SOL, not an ATA):

```jsonc
POST /api/v1/executions/{wallet}
// header: x-api-key: <your key>
{
  "version": "1.0",
  "type": "solana",
  "outOperation": true,
  "quote": {
    "originAsset": "<1click asset id for native SOL>",
    "amount": "500000000",
    "destinationAsset": "<1click destination asset id on the far chain>",
    "slippageTolerance": 100,
    "swapType": "EXACT_INPUT",
    "deadline": "2026-07-17T12:00:00Z"
  },
  "steps": [
    { /* the WithdrawSol step above, poolTokens = jitoSOL to burn */ },
    {
      "metadata": { "name": "Transfer to deposit address", "description": "Send withdrawn SOL to the 1Click bridge" },
      "programId": "11111111111111111111111111111111",
      "discriminator": "02000000",
      "args": [
        // EXACT_INPUT: send any u64 (e.g. the amount you're withdrawing) — the service
        // overwrites it with quote.amount − networkFee. EXACT_OUTPUT: send the
        // literal "{AMOUNT_IN}" placeholder instead.
        { "name": "lamports", "type": "u64", "value": "500000000" }
      ],
      "accounts": [
        { "pubkey": "{INTERMEDIARY}",     "isSigner": true,  "isWritable": true },  // from (only signer)
        { "pubkey": "{DEPOSIT_ADDRESS}",  "isSigner": false, "isWritable": true }   // 1Click deposit (bare wallet)
      ]
    }
  ],
  "dry": false
}
```

* **EXACT\_INPUT** — put any `u64` in the producer `lamports` (e.g. the amount you're withdrawing). The service **overwrites** it with a deterministic `quote.amount − networkFee` (known up front — not the withdraw's actual on-chain output). Size the `WithdrawSol` so the SOL it produces covers `quote.amount`, or the pre-sign simulation reverts (`400`). **There is no `{amount}` sentinel on the wire** — the only backend placeholders are `{INTERMEDIARY}`, `{MIN_AMOUNT_OUT}`, `{DEPOSIT_ADDRESS}`, and `{AMOUNT_IN}`.
* **EXACT\_OUTPUT** — put the **`{AMOUNT_IN}`** placeholder in the producer `lamports`. It substitutes to the origin commitment `quote.amountIn + network fee`, but the producer's amount is then overwritten to `quote.amountIn` (the fee is a separate injected transfer). 1Click refunds unused slippage. `{AMOUNT_IN}` is valid only in this position.

An out-operation signs at creation and has no deposit phase.

***

### Fees and the rent reserve

* **The fee is native SOL.** For a native-SOL action the service uses its 2-signer gas model (a backend account that is both fee payer and durable-nonce authority, plus your intermediary). The service pays the on-chain SOL gas, then appends a native-lamport `Transfer` to its service-fee address that debits the intermediary. So the fee comes out of the intermediary's **SOL** balance — which is why staking or transferring your _whole_ balance fails, and why the three-request carve exists.
* **Rent-exempt reserve.** A system account can't be left in the sub-rent "dust" band. On a **bridge-in** the service reserves the rent-exempt minimum as well as the fee when it resolves `{MIN_AMOUNT_OUT}`. For a **steps-only** action you must leave that reserve yourself — size the amount to `balance − networkFee − rentReserve`.
* **Do not add compute-budget, nonce, or fee instructions** — the service injects those. A `dry: true` preview omits those injected instructions. Steps-only and out-operation echoes are otherwise your submitted steps verbatim, while a bridge-in echo additionally resolves `{MIN_AMOUNT_OUT}` to its post-fee value. A real create returns the exact transaction the service signs.

### Sign and submit

The create response returns, under `result.details`, a `payload` to sign and a `signingStandard` — **your origin wallet's** standard. Sign `result.details.payload` with your origin wallet exactly as for any destination — you never handle the inner Solana message — then submit:

```
POST /api/v1/executions/{wallet}/submit
```

The submit body is `{ signature, executionId }` for an EVM or Tron origin. An ed25519 origin (Solana, NEAR, or Stellar) must also include `publicKey`. A TON origin includes both `publicKey` and a `tonConnect` envelope, so its body is `{ signature, executionId, publicKey, tonConnect }`.
