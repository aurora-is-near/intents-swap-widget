---
icon: coin-blank
---

# Fees Collection

Fees Collection lets integrators collect fees in a single asset of their choice, without managing the underlying fee aggregation and conversion process.

For example, an integrator can choose to receive all collected fees as **USDC on their preferred destination chain**, even when the underlying user transactions involve different assets.

### How it works

Fees generated through the integration accrue automatically and are consolidated into the integrator’s selected **target asset**.

The accumulated balance is withdrawn to the integrator’s designated recipient address once it reaches the configured withdrawal threshold.

By default:

* Fees are collected in the integrator’s selected target asset.
* The default withdrawal threshold is **$1,000 USD**.
* Once the threshold is reached, the accumulated fees are sent to the configured recipient address on the target chain.

This means integrators do not need to manage individual fee balances across different assets or manually consolidate them.

### Example

An integrator chooses:

**Target chain:** Base **Target asset:** USDC **Recipient:** `0x...`

As users transact through the integration, the integrator’s fees accumulate and are converted into USDC. Once the accumulated value reaches the configured threshold, the USDC is withdrawn to the provided recipient address.

### Requesting Fees Collection

Fees Collection is configured by Aurora.

To enable it for your integration, contact Aurora and provide:

* **Target chain** — the chain where you want to receive the collected fees
* **Target asset** — the asset in which you want to receive the fees; **USDC is typically recommended**
* **Recipient address** — the address on the target chain that should receive the funds

Aurora will configure the fee collection flow for your integration.

If you require a withdrawal threshold other than the default **$1,000 USD**, include it in your request.
