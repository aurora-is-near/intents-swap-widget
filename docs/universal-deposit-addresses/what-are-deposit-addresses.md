---
icon: book-open-lines
---

# What are Deposit Addresses?

Universal Deposit Addresses (UDAs) are a deposit primitive built on NEAR Intents. Generate one address per user - the system handles chain detection, routing, asset conversion, and settlement.

<figure><img src="../.gitbook/assets/Screenshot 2026-04-16 at 11.37.41.png" alt="" width="375"><figcaption></figcaption></figure>

## Overview

A UDA is a deterministic, chain-specific address derived from a fixed set of inputs: user identifier, source chain, recipient address, and output asset. Given the same inputs, the API always returns the same address. There is no expiry, no regeneration, and no per-transaction state to manage.

{% hint style="info" %}
The UDA is unique per chain and supports multiple asset deposits.
{% endhint %}

The user performs a standard token transfer to the address. Everything after that — monitoring, routing via NEAR Intents, optional swap, and crediting the destination — is handled on the infrastructure side with no further input required from the user or the integrating application.

## Features

#### Static address

Each address is permanent and reusable. There is no TTL, no session, and no requirement to re-generate between deposits. The same address accepts unlimited sequential deposits.

#### Cross-chain routing

Deposits from any supported source chain are automatically detected and routed. The integrating application does not need to handle per-chain logic or monitor incoming transactions.

#### Asset conversion

An optional output asset can be specified at address generation time. If the deposited asset differs from the output asset, a swap is executed in the same atomic flow via NEAR Intents solvers. Example: `USDT on Tron → USDC on Base`.

#### Destination action

You define what happens on arrival: credit a balance, execute a contract call, or fund a position. The destination action is encoded at generation time and does not require a separate call.

#### Non-EVM Support

Source chains include EVM networks and non-EVM chains: Tron, Bitcoin, Zcash, Solana, TON, and NEAR. See [Supported Chains →](https://docs.near-intents.org/resources/chain-support) for the full list.

#### Permissionless

No allowlist, no approval process. API keys are issued immediately. Start generating addresses and testing end-to-end flows without contacting the team.

#### Webhooks (coming soon)

Stay informed about transaction status updates with webhooks. Set up URL endpoints to receive event notifications directly from the system, allowing seamless integration into your existing workflows.

## Use Cases

#### Neobank & fintech top-up

Give every user a persistent top-up address. They can send from any chain or CEX, and the funds are automatically added to their balance. No bridging instructions, no wrong-chain support tickets.

```
Example: SOL on Solana → routed → Neobank account credited in USDC on Base
```

#### Prediction market funding

Users with assets on any chain can fund positions directly: no redirect, no bridge UI, no chain-switching prompt in the middle of a flow.

```
Example: USDT on Arbitrum → routed → prediction market account balance credited
```

#### Trading account deposit

A persistent deposit address means capital flows from any chain or CEX directly into a trading account: no manual bridging, no network selection, no drop-off between decision and execution.

#### Infrastructure & protocol inbound liquidity

Handle deposits from any chain natively without maintaining per-chain connectors. Embed one address generation call and let the routing layer handle the rest.

{% hint style="info" %}
### Supported Chains and Assets

**Supported Chains**

See a full list of supported chains here [Supported Chains →](https://docs.near-intents.org/resources/chain-support)

**Supported Assets**

See a full list of supported assets here [Supported Assets →](https://docs.near-intents.org/resources/asset-support)
{% endhint %}

## Before You Start

* No account approval required. API keys are issued immediately via the developer console.
* Default rate limits apply during testing. Contact us to increase production limits.
* No setup cost. No per-seat or support charges. Pricing is usage-based: you are billed only on transaction volume. There are no minimum commitments and no charges until your first settled transaction.

> **Questions?** [Talk to the team →](mailto:contact@aurora.dev)
