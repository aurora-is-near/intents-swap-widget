---
icon: book-open-lines
---

# What are Intents Deposits?

Deposit Addresses are a deposit primitive built on NEAR Intents. Generate a deposit address for the user - the system handles chain detection, routing, asset conversion, and settlement.

<figure><img src="../.gitbook/assets/Screenshot 2026-04-16 at 11.37.41.png" alt="" width="375"><figcaption></figcaption></figure>



The user performs a standard token transfer to the address. Everything after that — monitoring, routing via NEAR Intents, optional swap, and crediting the destination — is handled on the infrastructure side with no further input required from the user or the integrating application.

## Features

### Cross-chain routing

Deposits from any supported source chain are automatically detected and routed. The integrating application does not need to handle per-chain logic or monitor incoming transactions.

### Non-EVM Support

Source chains include EVM networks and non-EVM chains: Tron, Bitcoin, Zcash, Solana, TON, and NEAR. See [supported-chains-and-assets.md](supported-chains-and-assets.md "mention") for the full list.

### Permissionless

No allowlist, no approval process. API keys are issued immediately. Start generating addresses and testing end-to-end flows without contacting the team.

### Webhooks (coming soon)

Stay informed about transaction status updates with webhooks. Set up URL endpoints to receive event notifications directly from the system, allowing seamless integration into your existing workflows.

### Persistent addresses (coming soon)

expl

## Next Steps

{% stepper %}
{% step %}
### Create API key

First, create an account and set up [api-keys-and-fees.md](../swap-widget/api-keys-and-fees.md "mention") for your integration.
{% endstep %}

{% step %}
### Decide on the integration path

<table data-card-size="large" data-view="cards"><thead><tr><th></th><th data-hidden data-card-cover data-type="image">Cover image</th></tr></thead><tbody><tr><td><a data-mention href="quickstart/widget-integration.md">widget-integration.md</a></td><td data-object-fit="contain"><a href="../.gitbook/assets/Screenshot 2026-04-16 at 11.37.41.png">Screenshot 2026-04-16 at 11.37.41.png</a></td></tr><tr><td><a data-mention href="quickstart/api-integration.md">api-integration.md</a></td><td><a href="https://images.unsplash.com/photo-1594904351111-a072f80b1a71?crop=entropy&#x26;cs=srgb&#x26;fm=jpg&#x26;ixid=M3wxOTcwMjR8MHwxfHNlYXJjaHwzfHxhcGl8ZW58MHx8fHwxNzc2OTI1NjMwfDA&#x26;ixlib=rb-4.1.0&#x26;q=85">https://images.unsplash.com/photo-1594904351111-a072f80b1a71?crop=entropy&#x26;cs=srgb&#x26;fm=jpg&#x26;ixid=M3wxOTcwMjR8MHwxfHNlYXJjaHwzfHxhcGl8ZW58MHx8fHwxNzc2OTI1NjMwfDA&#x26;ixlib=rb-4.1.0&#x26;q=85</a></td></tr></tbody></table>
{% endstep %}
{% endstepper %}

> **Questions?** [Talk to the team →](mailto:contact@aurora.dev)
