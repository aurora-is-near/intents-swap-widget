---
icon: wave-pulse
---

# Swap Lifecycle

A swap starts with a quote, continues when the origin asset reaches its deposit address, and ends with a payout or refund. This guide describes the standard, non-confidential Swap API flow.

{% stepper %}
{% step %}
### Request a quote

Get supported asset IDs from `GET /api/tokens/{apiKey}`, then call `POST /api/quote/{apiKey}` with the origin and destination assets, amount, swap type, slippage tolerance, recipient, and refund address.

Use `dry: true` to preview pricing; request a non-dry quote when the user is ready to deposit.

The non-dry response supplies `depositAddress` (and `depositMemo` where required), `amountIn`, `amountOut`, `minAmountOut` and timing fields. Amounts are in each asset's base unit. Show the expected and minimum output before the user sends funds. Do not reuse a quote for a different route, amount, or recipient.
{% endstep %}

{% step %}
### Fund the deposit

Send the quoted origin asset to `depositAddress` on the correct chain, with `depositMemo` if present. For `EXACT_INPUT`, send `amountIn`. Other swap types have different deposit rules; follow the returned `minAmountIn` and `maxAmountIn` when applicable. The deposit address alone does not initiate a swap until funds arrive.

You can optionally call `POST /api/deposit/submit/{apiKey}` with the deposit transaction hash to speed up detection. This call does not transfer funds or replace the on-chain deposit.

On Solana, an SPL-token deposit needs the appropriate token account at the deposit address. If it does not exist, create it as part of the deposit transaction before transferring the token. A failed on-chain transfer is not a deposit and does not trigger a refund.
{% endstep %}

{% step %}
### Track execution

Poll `GET /api/status/{apiKey}?depositAddress=...` and keep the deposit address as your swap identifier. The usual progression is `PENDING_DEPOSIT` (or `KNOWN_DEPOSIT_TX` after submission), `PROCESSING`, then `SUCCESS`.

`INCOMPLETE_DEPOSIT` means the received amount is below the required amount. `SUCCESS`, `REFUNDED`, and `FAILED` are terminal statuses. Handle `FAILED` as an exception requiring investigation rather than assuming a refund occurred.

`SUCCESS` means the destination asset was paid to `recipient`. The actual payout can differ from `amountOut` but must respect the quote's `minAmountOut` for a successful swap.
{% endstep %}
{% endstepper %}

### Deadlines and inactivity

The `deadline` you send in the quote request is the time by which the deposit should be made. If you omit it, the API applies a default. Treat this requested deadline as your user-facing cutoff: after it passes, request a new quote instead of sending funds to the old address.

The response may also include `quote.deadline` and `timeWhenInactive`, which can be later than the requested deadline. `timeWhenInactive` describes when the deposit address becomes inactive; it is **not** a promise that deposits made after your requested deadline will still swap, nor a refund completion time. Continue checking status for deposits already sent, and do not infer a late-deposit outcome from the timestamps alone.

### Refunds and exceptions

Set `refundTo` and `refundType` to a valid destination you control before requesting the quote. If a deposit is too small, a swap cannot complete under the quote's terms, or the service otherwise refunds the deposit, status becomes `REFUNDED`; inspect the returned refund details and transaction rather than assuming the full original amount is returned. A quoted `refundFee`, when present, can reduce the returned amount.

For `EXACT_INPUT`, an underpayment is refunded if the required amount has not arrived by the applicable refund deadline; if more than `amountIn` arrives, the swap can proceed and the excess is refunded separately. For `EXACT_OUTPUT`, deposits below `minAmountIn` are refunded, while an amount above `maxAmountIn` can be partially refunded after execution. Avoid sending additional funds to an old deposit address to recover an incomplete swap without first checking its status and quote terms.

Refund time varies by chain, network conditions, and when the swap failed; there is no fixed per-chain completion time to rely on. While a refund is pending, show the latest API status (for example, `INCOMPLETE_DEPOSIT` or `PROCESSING`) and a "Refund pending" message rather than a countdown or a completed refund. Keep checking status, and show the refund amount and transaction once the API reports `REFUNDED`. If it reports `FAILED` instead, surface that as an issue requiring support rather than telling the user their funds were returned.

For request and response schemas, see the [swap-api-reference](../api-reference/swap-api-reference/ "mention").
