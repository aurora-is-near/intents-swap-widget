---
icon: key
---

# API Keys & Fees

{% hint style="info" %}
You can generate as many API keys as you need and use them across different distribution channels in [Intents Studio](https://intents.aurora.dev/).
{% endhint %}

Once you have created your API key, you can use it either with the [Swap Widget](/broken/pages/WDpfh0kroISpVsdJQ6oM) or the [API](../deposit-addresses/swap-api-reference/). The key is not confidential, allowing its use in public-facing services such as websites.

### Fees

The collected fee is split 60/40 between the Integrator (60%) and Aurora (40%).

The minimum Aurora fee floor is 2 basis points, calculated as follows: Aurora Fee = max(2 bps, 40% of the Integrator fee).

The maximum fee set is 100 basis points.

You can modify fees related to each API key by navigating to the API keys tab and clicking Edit fees.

#### Examples

| Integrator Fee | Integrator Share (60%) | Aurora Fee Applied |
| -------------- | ---------------------- | ------------------ |
| 0 bps          | 0 bps                  | 2 bps              |
| 5 bps          | 3 bps                  | 2 bps              |
| 10 bps         | 6 bps                  | 4 bps              |
| 20 bps         | 12 bps                 | 8 bps              |

### Reports

In the Widget Studio, you can download a full report of the swaps that executed through your API keys. Log in, click Export code and go to Reports - you'll find Download CSV report there with a detailed breakdown and a full list of swaps linked to your API keys.
