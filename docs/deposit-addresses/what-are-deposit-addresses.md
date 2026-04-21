---
icon: book-open-lines
---

# What are Deposit Addresses?

Deposit Addresses are a deposit primitive built on NEAR Intents. Generate a deposit address for the user - the system handles chain detection, routing, asset conversion, and settlement.

<figure><img src="../.gitbook/assets/Screenshot 2026-04-16 at 11.37.41.png" alt="" width="375"><figcaption></figcaption></figure>



The user performs a standard token transfer to the address. Everything after that — monitoring, routing via NEAR Intents, optional swap, and crediting the destination — is handled on the infrastructure side with no further input required from the user or the integrating application.

## Features

### Cross-chain routing

Deposits from any supported source chain are automatically detected and routed. The integrating application does not need to handle per-chain logic or monitor incoming transactions.

### Non-EVM Support

Source chains include EVM networks and non-EVM chains: Tron, Bitcoin, Zcash, Solana, TON, and NEAR. See [Supported Chains →](https://docs.near-intents.org/resources/chain-support) for the full list.

### Permissionless

No allowlist, no approval process. API keys are issued immediately. Start generating addresses and testing end-to-end flows without contacting the team.

### Webhooks (coming soon)

Stay informed about transaction status updates with webhooks. Set up URL endpoints to receive event notifications directly from the system, allowing seamless integration into your existing workflows.

## Next Steps

{% stepper %}
{% step %}
### Create API key

First, create an account and an [API key](../swap-widget/api-keys-and-fees.md) for your integration, and decide on the fee structures.
{% endstep %}

{% step %}
### Integrate the widget

Go to the [API integration](api-integration.md) page.
{% endstep %}
{% endstepper %}

> **Questions?** [Talk to the team →](mailto:contact@aurora.dev)
