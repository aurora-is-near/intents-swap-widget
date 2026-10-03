---
icon: key
---

# API Keys & Fees

{% hint style="success" %}
You can generate as many API keys as you need and use them across different distribution channels in [Intents Studio](https://studio.aurora.dev/). To monitor your integrations (swap volume, transactions, fees and reports), use the [Client Portal](https://portal.intents.aurora.dev/).
{% endhint %}

Once you have created your API key, you can do [widget-integration.md](../intents-deposits/quickstart/widget-integration.md "mention") or [api-integration.md](../intents-deposits/quickstart/api-integration.md "mention") or [Intents Connect](<../README (1).md>). The API key is not confidential and can be used in public-facing services such as websites.

### Fees

{% hint style="info" %}
Fees accrue atomically, meaning that they're distributed after each successful swap.
{% endhint %}

The collected fee is split 60/40 between the Integrator (60%) and Aurora (40%).

The minimum Aurora fee floor depends on the asset type: 10 basis points for non-stable tokens and 2 basis points for stable tokens.

It is calculated as follows:

* Non-stables: Aurora Fee = max(10 bps, 40% of the Integrator fee)
* Stables: Aurora Fee = max(2 bps, 40% of the Integrator fee)

The maximum fee set is 500 basis points.

In [client-portal.md](client-portal.md "mention"), you can modify fees related to each API key.

#### Examples

| Integrator Fee | Integrator Share (60%) | Aurora Fee (stable) | Aurora Fee (non-stable) |
| -------------- | ---------------------- | ------------------- | ----------------------- |
| 0 bps          | 0 bps                  | 2 bps               | 10 bps                  |
| 5 bps          | 3 bps                  | 2 bps               | 10 bps                  |
| 10 bps         | 6 bps                  | 4 bps               | 10 bps                  |
| 20 bps         | 12 bps                 | 8 bps               | 10 bps                  |
| 30 bps         | 18 bps                 | 12 bps              | 12 bps                  |

### Analytics

In the [client-portal.md](client-portal.md "mention"), you can see analytics of the swaps executed through your API keys. Sign in at [https://portal.intents.aurora.dev](https://portal.intents.aurora.dev/)
