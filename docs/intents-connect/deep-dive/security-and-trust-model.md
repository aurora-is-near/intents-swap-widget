---
icon: shield-keyhole
---

# Security & Trust Model

{% hint style="warning" %}
**Pre-release** — Details are subject to change as the design is finalised.
{% endhint %}

### What the user signs

Every action through Intents Connect requires an explicit user signature. The signed message contains the complete specification of the action:

* Source wallet and source chain
* Destination chain and target protocol
* Asset, amount, and receiver
* Maximum fee
* Allowed execution path
* Deadline and nonce

Nothing outside this authorisation can be executed. The message is structured so it can be displayed clearly to the user before signing — the intent is human-readable, not an opaque hash.

### Replay protection

Each intent includes a nonce and an expiry deadline. A signed intent cannot be replayed after it expires, and each nonce can only be used once per wallet.

### Scope of the intermediary account

The intermediary account on the destination chain is fully controlled by the origin wallet that signs the intent. It:

* Cannot act outside the scope of the specific signed intent
* Cannot be triggered by any party outside the authorised execution path
* Cannot execute any transaction without the explicit authorisation from the origin wallet

### Failure handling

If execution cannot be completed due to gas spikes, protocol pauses, or other unexpected conditions, the system doesn't control the intermediary account, so explicit user authorisation is required.

Unspent or stranded funds are not silently abandoned. The failure reason is surfaced to the UI, and recovery paths are available for every failure state.

Read more about failure handling under [execution-lifecycle.md](execution-lifecycle.md "mention").
