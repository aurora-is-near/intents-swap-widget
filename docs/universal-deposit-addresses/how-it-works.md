---
icon: book
---

# How It Works

{% hint style="warning" %}
**Pre-release** — Details are subject to change as the architecture is finalised.
{% endhint %}

When your app calls the UDA (Universal Deposit Address) API, it receives a reusable deposit address tied to a specific source chain and destination. The user sends a regular token transfer to that address — no bridging UI, no extra steps. The system detects the deposit, routes it through NEAR Intents, executes any required swap, and funds the destination.

<figure><img src="../.gitbook/assets/uda.png" alt=""><figcaption></figcaption></figure>

{% stepper %}
{% step %}
### App requests a deposit address

Apps call the UDA API with the minimal parameters: deposit chain, recipient and output asset.
{% endstep %}

{% step %}
### Receive a reusable address

The UDA API returns a reusable Deposit Address along with the current exchange rates.
{% endstep %}

{% step %}
### User sends funds

User transfers tokens to the Deposit Address.
{% endstep %}

{% step %}
### System processes the transfer

NEAR Intents swap agent handles routing and processes the transaction.
{% endstep %}

{% step %}
### Recipient gets funds

The destination asset is delivered to the recipient on the destination chain.
{% endstep %}
{% endstepper %}

***
