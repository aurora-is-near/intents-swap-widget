---
icon: book-open
---

# Transfer USDC scenario

A worked, self-contained example of moving USDC out of your Solana intermediary's USDC account with a **steps-only** execution — the intermediary already holds the USDC, and you simply send some of it to another account.

The transfer itself is a single SPL Token `Transfer` instruction. This document also includes the small amount of surrounding context you need (the intermediary, the token accounts, and the sign/submit flow) so it stands on its own.

### What runs on-chain

One SPL Token `Transfer` (opcode `03`):

* **program**: the SPL Token program `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
* **arg**: a single `u64` `amount` in the token's base units
* **accounts**, in this exact order:
  1. `source` — the intermediary's USDC token account (funds leave here)
  2. `destination` — the recipient's USDC token account (funds arrive here)
  3. `authority` — the intermediary, which authorizes the transfer (`{INTERMEDIARY}`)

USDC has **6 decimals**, so amounts are `value × 10^6` base units: 25 USDC = `25000000`, 1.5 USDC = `1500000`.

### The two token accounts

**`source` — your intermediary's USDC ATA.** Derive it from your resolved Solana intermediary and the USDC mint:

1. Fetch your Solana intermediary: `GET /api/v1/executions/{wallet}/intermediary` → read `result.solana`.
2. Derive its associated token account — a program-derived address of `[ intermediary, TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA, EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v ]` under the associated-token-account program `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL`, where `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` is the USDC mint.
3. Use that base58 address as `source`.

**`destination` — the recipient's USDC token account.** This is the recipient's associated token account for the USDC mint (derived the same way, with the recipient's wallet as the owner). If it might not exist yet, prepend an associated-token-account `CreateIdempotent` for it and name `{INTERMEDIARY}` as the funder — the service reassigns the funder to the transaction fee payer at signing time, and bills the one-time rent into the fee only if the account was actually missing.

**`authority`** is the account that owns `source` and authorizes the debit — your intermediary. Send it as the `{INTERMEDIARY}` placeholder. The service substitutes your resolved Solana address before signing. It is the **only** account you may mark as a signer.

### The request

```jsonc
POST /api/v1/executions/0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5/steps
{
  "version": "1.0",
  "type": "solana",
  "destinationAsset": "<destination asset id for USDC on Solana>",
  "steps": [
    {
      "metadata": { "name": "Transfer USDC", "description": "Send 25 USDC to the recipient" },
      "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "discriminator": "03",
      "args": [
        { "name": "amount", "type": "u64", "value": "25000000" }   // 25 USDC (6 decimals)
      ],
      "accounts": [
        { "pubkey": "<intermediary USDC ATA>", "isSigner": false, "isWritable": true  },
        { "pubkey": "<recipient USDC account>", "isSigner": false, "isWritable": true  },
        { "pubkey": "{INTERMEDIARY}",           "isSigner": true,  "isWritable": false }
      ]
    }
  ],
  "dry": false
}
```

* `type: "solana"` selects the Solana step shape.
* `destinationAsset` is the destination token id for USDC on Solana.
* The `metadata` object is optional display text and can be omitted.
* Add `"dry": true` to preview the network fee without committing.

#### `TransferChecked` variant (optional, safer)

If you prefer the checked variant — which additionally verifies the mint and its decimals on-chain — use opcode `0c`, add a `u8` `decimals` arg after `amount`, and insert the mint as the second account:

```jsonc
{
  "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "discriminator": "0c",
  "args": [
    { "name": "amount",   "type": "u64", "value": "25000000" },
    { "name": "decimals", "type": "u8",  "value": 6 }
  ],
  "accounts": [
    { "pubkey": "<intermediary USDC ATA>",                         "isSigner": false, "isWritable": true  },
    { "pubkey": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",    "isSigner": false, "isWritable": false },  // USDC mint
    { "pubkey": "<recipient USDC account>",                        "isSigner": false, "isWritable": true  },
    { "pubkey": "{INTERMEDIARY}",                                  "isSigner": true,  "isWritable": false }
  ]
}
```

### Rules that apply here

* **Only `{INTERMEDIARY}` may be a signer.** Do not mark any other account `"isSigner": true`.
* **Do not add a fee, compute-budget, or nonce instruction.** The service injects those itself. On a real create the returned `steps` mirror the transaction the service signs, so they include the fee transfer the service appends (plus any associated-token-account create it prepends), and your `{INTERMEDIARY}` placeholder appears resolved to a concrete address. Only a `dry: true` preview echoes your submitted steps back unchanged.
* **The fee is charged in USDC via a gasless relayer (Kora).** SPL destinations settle through Kora, which pays the SOL gas and collects the network fee as an SPL transfer in the destination token — debited from the same intermediary USDC balance, so the amount you send plus the fee must fit. The destination mint must be on the deployment's `kora_fee_token_mints` allow-list (USDC is), or create returns `400`.
* **A steps-only SPL action must touch its destination token.** This transfer does — `source` is the intermediary's ATA for the destination mint — so the requirement is satisfied.
* **Amounts are base units, strictly encoded.** A value that overflows `u64` or a negative value is rejected, not wrapped.

### Sign and submit

The create response returns, under `result.details`, a `payload` to sign and a `signingStandard` — **your origin wallet's** standard (for example `erc191` for an EVM origin, `raw_ed25519` for a Solana origin). Sign `result.details.payload` with your origin wallet exactly as you would for any destination — you never handle the inner Solana message — then submit:

```
POST /api/v1/executions/{wallet}/submit
```

The submit body is `{ signature, executionId }` for an EVM or Tron origin. An ed25519 origin (Solana, NEAR, or Stellar) must also include `publicKey`. A TON origin includes both `publicKey` and a `tonConnect` envelope, so its body is `{ signature, executionId, publicKey, tonConnect }`. On success the execution proceeds and the USDC moves from the intermediary's account to the recipient.
