---
icon: comments-question-check
---

# Frequently Asked Questions

## Persistent Deposit Addresses

<details>

<summary>Can a deposit fail?</summary>

Deposits use an ongoing conversion flow. Failed deposits are retried rather than automatically refunded under the deadline-based refund rules used for regular swaps.

If a deposit has not been processed and it is above the threshold, submit a case through[handling-support-cases.md](handling-support-cases.md "mention"). Include the deposit address, source transaction hash, network, asset, amount and any error details. Handle investigation updates through the support case.

</details>

<details>

<summary>What are the minimum deposit amounts?</summary>

The recommended minimum deposit is $1. Or $2 for TRON. If the user deposits less, their funds may get stuck because processing costs exceed the deposit amount.

Before enabling a high-volume deposit route, contact the integration team to confirm the applicable minimums and processing thresholds.

Distinguish between the minimum amount accepted on the source chain and the balance required to trigger the swap processing. Display the applicable requirements in your deposit interface before users transfer funds. Check our [ux-recommendations.md](ux-recommendations.md "mention") page on this point.

</details>

<details>

<summary>What happens if an unsupported asset is deposited?</summary>

Only send supported assets on supported networks. Do not assume that unsupported assets or deposits below the processing threshold will be automatically returned.

</details>

<details>

<summary>How do I track deposit status?</summary>

Use the [persistent deposit status](../../api-reference/persistent-addresses-api-reference/get-persistent-deposit-status.md) endpoint:

`GET /api/persistent-deposit-status/{apiKey}?address=...&type=...`

The `type` parameter selects which records to return:

| Value      | Meaning                                      |
| ---------- | -------------------------------------------- |
| `received` | Deposits that reached the Intents account.   |
| `success`  | Completed outbound payouts to the recipient. |
| `failed`   | Failed outbound payouts to the recipient.    |

For an external destination wallet, treat `received` as an intermediate step. It does not mean the destination asset has reached the recipient yet. `success` value means the assets have reached the recipient.

Keep [rate-limits.md](rate-limits.md "mention") in mind during integration.

</details>

<details>

<summary>What fees apply to deposits?</summary>

You can read in detail about the fees under [api-keys-and-fees.md](../api-keys-and-fees.md "mention").

Execution can also involve network gas, market-maker spreads and bridge or withdrawal costs. Costs vary by route and network conditions, so the delivered amount may be lower than the deposited amount.

Persistent addresses do not lock an exchange rate when created. Conversion pricing and the applicable app fees are determined when deposits are processed, using the actual deposited asset.

Show expected fee information before deposits wherever possible, and use the actual delivered amount when reconciling a completed payout.

</details>

<details>

<summary>How long does swap take? Is settlement guaranteed within a fixed time?</summary>

Swap processing time depends on source-chain confirmation, deposit processing, conversion, and destination-chain payout. Accumulation thresholds, retries and network incidents can increase the total time.

You can expect higher processing times for chains such as Bitcoin that require longer block finalisation times.

Track the payout through the [status endpoint](../../api-reference/persistent-addresses-api-reference/get-persistent-deposit-status.md) and show users that delivery is pending until it completes. Contact the integration team for route-specific timing expectations and any contractual SLA.

</details>

<details>

<summary>Are deposits screened for sanctions and transaction risk?</summary>

NEAR Intents has compliance controls to prevent a swap from proceeding if it's suspicious. Certain checks can reject a swap at the request stage, before funds are sent, although not every issue can be identified upfront. If a transaction is flagged later, it may require review before it can proceed or funds can be returned, subject to applicable restrictions.\
\
We, Aurora, act as a reseller and integration service provider and do not independently determine AML outcomes, nor do we have any understanding of flagged funds.\
\
For all AML-related information, including applicable restrictions, please refer to the [NEAR.com Terms](https://near.com/terms).

</details>

<details>

<summary>Is a sandbox or testnet available?</summary>

There is no public testnet deployment. Test the complete deposit flow on mainnet using separate development wallets and small amounts above the confirmed processing thresholds.

</details>

<details>

<summary>How do I enable persistent deposit addresses?</summary>

Creating new persistent deposit addresses requires organisation approval. Creating an account and API key using [client-portal.md](../client-portal.md "mention") may not automatically enable this capability.

Contact the integration team to request access and confirm any required company information or verification.

Use a stable user identifier in `sender`, the destination wallet in `recipient`, and the intended destination chain and asset.

Supported EVM chains share one deposit address. Generate it once using an EVM chain or `depositChain: "evm"`; the returned address works across supported EVM networks. Other chain families use their corresponding deposit addresses.

For Stellar, deposits must include the memo returned with the address.

</details>

