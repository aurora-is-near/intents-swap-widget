---
icon: book-open
---

# Getting your Solana intermediary address

A Solana action does not run from your own wallet. It runs from a dedicated **intermediary account** that the service controls on your behalf. On Solana this is an ed25519 account **deterministically derived from your origin wallet** — it is stable for a given origin wallet, but you cannot compute it yourself, so you fetch it from the API.

This document covers how to obtain that address from an origin wallet (an EVM `0x…` address is the worked example), what the response looks like for every origin type, and how to derive the intermediary's token accounts from it.

### From an EVM address to a Solana address

Call the intermediary endpoint with your origin wallet in the path:

```
GET /api/v1/executions/0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5/intermediary
```

The response returns **both** intermediaries — the EVM one and the Solana one — regardless of which origin you used:

```jsonc
{
  "result": {
    "originAccount": "0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5",  // the wallet you passed
    "originType":    "evm",                                          // detected from the path
    "evm":           "0x9c8B7a6F5e4D3c2B1a09F8e7D6c5B4a3928170615",  // your EVM intermediary
    "solana":        "2fjhr2fzcoHYvdKkYpxBsUnE5QDg2hhb2mnxfwrL7RTY"   // your SOLANA intermediary
  }
}
```

Read `result.solana` — that base58 string is **your** Solana intermediary account. It is the account that will hold your tokens on Solana and act as the authority/signer for your steps.

Field by field:

| Field           | Meaning                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `originAccount` | the wallet address you passed in the path, echoed back                                                |
| `originType`    | the detected origin type — `evm`, `solana`, `near`, `stellar`, `tron`, or `ton`                       |
| `evm`           | your EVM intermediary (secp256k1 account)                                                             |
| `solana`        | your Solana intermediary (ed25519 account), base58 — or `null` if Solana destinations are not enabled |

Notes:

* The address is **deterministic and stable**: the same origin wallet always maps to the same Solana intermediary.
* `solana` is `null` when Solana destinations are disabled for the deployment (or if its derivation is temporarily unavailable). The `evm` intermediary is still returned in that case.

### Other origin types

The same endpoint accepts any supported origin wallet in the path — an EVM `0x…` address, a Solana base58 public key, a NEAR account (named or implicit), a Stellar `G…` address, a Tron `T…` address, or a TON user-friendly address. `originType` in the response tells you which was detected (a Solana origin is reported as `"solana"`).

#### TON origins need a public key

A TON address does not contain its public key, so for a TON origin you must pass the wallet's ed25519 public key as a query parameter, and it must be the key that owns the address:

```
GET /api/v1/executions/{tonWallet}/intermediary?publicKey=ed25519:7XSf…
```

Missing key → `400 {"error": "publicKey query parameter is required for TON wallets"}`. A malformed key (bad prefix, bad base58, or wrong length) → `400 {"error": "publicKey must be a valid ed25519:<base58> key"}`. A well-formed key that does not own the wallet → `400 {"error": "public key does not match wallet"}`. Use the **same** key you use when creating executions — a different key derives a different intermediary.

### Deriving the intermediary's token accounts

Token balances are held in **associated token accounts (ATAs)** owned by the intermediary. Your steps reference these ATAs by their concrete base58 address — there is no placeholder for an ATA, because the ATA address depends on the resolved intermediary. So:

1. Fetch the resolved Solana intermediary address (above).
2. Derive its associated token account for the relevant mint using the standard associated-token-account derivation — a program-derived address of `[ owner, tokenProgram, mint ]` under the associated-token-account program, where:
   * `owner` = the resolved Solana intermediary
   * `tokenProgram` = `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
   * `mint` = the token mint
   * associated-token-account program = `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL`
3. Put that concrete base58 ATA address into the step's `accounts`.

The intermediary itself still goes into steps as the `{INTERMEDIARY}` placeholder (as owner / authority / signer). Only the **derived ATA** goes in as a resolved address.

#### When the ATA does not exist yet

If an intermediary-owned ATA your steps reference does not exist yet, the service creates it for you inside the same signed transaction — you do not add a create step, and you are billed its one-time rent only if it was actually missing. (On a bridge-in, the destination token's ATA is provisioned by the bridge as it settles your deposit.)

If a step pays out to **someone else's** token account that might not exist, you must include the account-create yourself. Name `{INTERMEDIARY}` as its funder (the only signer you may name) and the service reassigns the funder to the fee payer at signing time.

### Using the address

In almost all cases you do **not** paste the resolved intermediary into your steps. Instead you use the placeholder `{INTERMEDIARY}` wherever the intermediary must appear, and the service substitutes the real address before it encodes and signs the transaction. Fetch the resolved address only when you need to **derive another account from it** — most commonly one of its token accounts, as above.
