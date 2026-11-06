---
icon: book-open
---

# Deadlines and validity windows

How long a user has to complete an Intents Connect execution. There is no single number: the user-facing window is **10 minutes for the deposit**, the signature is bounded by a 7-day cryptographic cap, and some families impose tighter limits of their own.

### 1. Quote deadline: 10 minutes from create (the deposit window)

* Set by `defaultQuoteDeadlineDuration`. The FE never sends `quote.deadline`, so the default always applies. A request may override it with an RFC3339 `quote.deadline`.
* The same value is passed to 1click as the quote deadline, which 1click defines as the time when the user refund begins if the swap isn't completed by then.
* On a bridge-in, the action tracker moves `CREATED`/`DEPOSIT_PENDING` to `EXPIRED` once the deadline passes. So the user has about 10 minutes to deposit.
* The deadline does **not** bound the signature. `POST /submit` accepts a signature on any `PREPARED` transaction regardless of execution status. A bridge-in whose deposit settled unsigned waits at `OPERATION_PENDING` ("deposit confirmed, tx pending signature") and runs when the signature arrives.
* Out-op and steps-only start at `OPERATION_PENDING`, so this check never expires them. On an out-op the 1click deadline still applies to the transfer to the deposit address.

### 2. Intent deadline: 7 days (the hard cap on the signature)

* `intent_deadline_minutes` defaults to 10080 and is baked into the signed NEAR intent. A signed payload that reaches `intents.near` after this is useless.
* `POST /submit` does not check it, so a signature submitted after it is accepted and then fails in the NEAR signer.
* `EXPIRED` is not final. If a bridge-in has a recorded deposit tx and a signature, the stale-deposit rescue (`checkStaleDeposits`) keeps polling 1click until this deadline. If 1click reports the deposit settled, the rescue revives the execution and it runs.

### 3. Per-family limits that can be tighter

| Family | Limit                                                                              | Effect                                                                                                                                                                                           |
| ------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EVM    | none on-chain                                                                      | The signed batch digest is `chainID \|\| nonce \|\| calls` with no expiry, so only the 7-day intent bounds it                                                                                    |
| Solana | **25 min** (`solana_nonce_hold_expiration_minutes`) from create to first broadcast | `ExpireHeldNonces` fails the execution (`OPERATION_FAILED`) and reclaims the durable nonce. Applies to all three Solana flows and is in practice the real limit on Solana, signature included    |
| Sui    | `ValidDuring{E, E+1}`                                                              | The transaction dies at the end of the next epoch, roughly **24 to 48 hours** after create on mainnet. `expireStaleSuiTransactions` fails the execution even if the transaction was never signed |

### Known gap

An EVM execution sitting at `OPERATION_PENDING` without a signature has no timeout. This covers out-op and steps-only executions that were never signed, and bridge-ins whose deposit settled before the user signed. The row keeps the intermediary locked (new creates for the same intermediary and chain get 409) until the user deletes it via `DELETE /api/v1/executions/:wallet/:executionId`.
