---
icon: paintbrush
---

# UX Recommendations

{% prompt description="Copy this prompt to AUDIT or BUILD your UI/UX" %}
```markdown
You are helping me build or fix a deposit screen that displays an Intents Deposit address.

First, determine which mode you are in:

If I have given you existing code, screenshots, or a description of a current deposit screen, run in AUDIT mode.
If I have not, run in BUILD mode.
Background you must assume

An Intents Deposit address is not a generic blockchain deposit address. A given address can technically receive many assets on its network, but Intents supports only a specific subset. If a user sends an unsupported asset, the deposit may not be processed and the funds may be difficult or impossible to recover.

Therefore the single job of this UI is to make it unambiguous what can be sent, before the user copies the address or scans the QR code. The goal is not to add more warnings. The goal is to remove ambiguity.

Non-negotiable rules
The deposit address must never be rendered without its transfer requirements.
The source network and the supported asset(s) must remain visible on screen at the same time as the address and the QR code. Never route the user to a screen that shows only the address.
The QR code must never appear alone. Users scan it and finish in another wallet where your UI is gone, so the network and asset must be obvious before they scan.
Transfer requirements must sit directly next to, or immediately below, the address — not in documentation, tooltips, FAQs, support articles, or a secondary screen.
The number of supported assets must be stated explicitly, so the user's mental model shifts from "this is my address on this network" to "this is a deposit address with specific supported assets."
Required flow
User selects or sees the source network.
UI states how many assets that address supports (e.g. 1 asset supported, 4 assets supported).
User selects the asset they intend to deposit.
Address and QR code are shown, tied visually to the selected network and asset.
Transfer requirements appear directly below the address.
Fees, estimated deposit time, minimum deposit, and any other restrictions are visible.
Required on-screen structure
Sending from chain     Bitcoin
Supported asset        BTC
Permanent deposit address
bc1q...
[QR code]

Transfer requirements
Send only BTC from the Bitcoin network.
Sending another asset or using another network may result in loss of funds.

Include additional conditions in that same block when they apply, for example:

Transfer requirements
Send only BTC from the Bitcoin network.
Minimum deposit: $1.
Do not send from an exchange if exchange deposits are not supported.

For higher-risk cases, use stronger wording:

Transfer requirements
Send only USDC from Ethereum. Sending any other token or using another network may result in
permanent loss of funds.
Copy rules

Do not use language implying broad compatibility:

❌ "Send funds to this address."
❌ "Deposit to this address."

Use language that names the constraint:

✅ "Send only BTC from the Bitcoin network to this address."
✅ "This address supports deposits of BTC from Bitcoin only."
Multiple supported assets

If the address supports several assets, make them discoverable — either list them (3 assets supported — USDC, USDT, ETH) or expose an asset selector. If the list is long, show the count and provide a dedicated selection screen rather than a long inline list. Under no circumstance should the UI let the user infer that every asset on the network is supported.

What to produce

BUILD mode: produce the component(s) for the deposit screen, including the network/asset selection step, the address panel, the QR code, and the transfer-requirements block. Keep the transfer-requirements text data-driven off the selected network and asset — never hardcode a generic string. State which framework and styling conventions you assumed if I did not specify.

AUDIT mode: return a checklist with a pass/fail against each of the five non-negotiable rules plus the copy rules, citing the specific file, component, or screen for each failure, and give the concrete fix (including replacement copy) for every failure. Rank the findings by risk of user fund loss, highest first.

Core principle to apply throughout

Users should never have to infer what can be sent to an Intents Deposit address. Every deposit address is presented with its supported network, its supported asset(s), and any relevant transfer requirements. If sending an unsupported asset can cause loss of funds, that risk is communicated before the user copies or scans the address.
```
{% endprompt %}

Intents Deposit addresses should not be presented as generic blockchain deposit addresses.

A deposit address can technically receive multiple different assets on a given network. However, Intents may support only a specific subset of those assets. This creates an important UX risk: if users see only an address and a QR code, they may reasonably assume that any asset supported by that network can be sent to that address.

If a user sends an unsupported asset, the deposit may not be processed, and the funds may be difficult or impossible to recover.

The integration should therefore make it very clear what can be deposited before the user sends anything.

### Recommended UX

When displaying an Intents Deposit address, show the transfer requirements directly alongside it.

At minimum, users should be able to immediately understand:

* which network they should send from;
* which asset or assets are supported;
* whether there is a minimum deposit amount;
* whether there are any other transfer restrictions;
* what can happen if they send something unsupported.

The deposit address should never appear without this context.

A good flow is:

1. The user selects or sees the source network.
2. The UI clearly shows how many assets are supported.
3. The user selects the asset they want to deposit.
4. The deposit address and QR code are shown.
5. Transfer requirements and warning are displayed directly next to, or immediately below, the address.

For example:

> **Transfer requirements**\
> Send only BTC from the Bitcoin network. Sending another asset or using another network may result in loss of funds.

If there are additional conditions, they should be included in the same area:

> **Transfer requirements**\
> Send only BTC from the Bitcoin network. Minimum deposit: $1. Do not send from an exchange if exchange deposits are not supported.

### Make supported assets visible

One of the most important parts of the UX is making it clear that the deposit address may not support every asset on the selected network.

For example, showing:

> **1 asset supported**

is useful because it immediately tells the user that the address has restrictions.

If multiple assets are supported, the UI can show:

> **4 assets supported**

and allow the user to view or select from the supported assets.

This is preferable to showing only a generic address because it changes the user's mental model from:

> "This is my address on this network."

to:

> "This is a deposit address with specific supported assets."

That distinction is important.

### Tie the address to the selected network and asset

The address should visually belong to the selected deposit configuration.

For example:

**Sending from chain**\
Bitcoin

**Supported asset**\
BTC

**Permanent deposit address**\
`bc1q...`

The network and supported asset should remain visible while the address and QR code are displayed.

Avoid flows where the user selects an asset on one screen and then lands on a separate screen that shows only:

> Deposit address\
> `bc1q...`

Once the asset and network disappear from the UI, the address becomes ambiguous again.

### Show the warning where the user needs it

Warnings should be placed close to the deposit address and QR code.

Do not hide this information inside:

* documentation;
* tooltips;
* FAQ pages;
* support articles;
* secondary screens.

The user needs this information at the moment they are about to copy or scan the address.

A dedicated **Transfer requirements** section works well because it is visible without interrupting the flow.

For example:

> **Transfer requirements**\
> Send only the selected asset from the selected network. Unsupported deposits may not be recoverable.

For higher-risk cases, stronger wording may be appropriate:

> **Transfer requirements**\
> Send only USDC from Ethereum. Sending any other token or using another network may result in permanent loss of funds.

### Avoid generic deposit copy

Avoid language that implies broad compatibility.

For example, avoid:

> Send funds to this address.

or:

> Deposit to this address.

Prefer:

> Send only BTC from the Bitcoin network to this address.

or:

> This address supports deposits of BTC from Bitcoin only.

The wording should reinforce that the deposit address has specific requirements.

### QR codes need the same context

A QR code should not be shown by itself.

Users often scan a QR code and complete the transaction in another wallet, where the original interface is no longer visible. The deposit screen should therefore make the supported network and asset obvious before the user scans.

A good structure is:

**Bitcoin**

**BTC supported**

`bc1q...`

\[QR code]

> **Transfer requirements**\
> Send only BTC from the Bitcoin network.

The same rules should apply whether the user copies the address or scans the QR code.

### If multiple assets are supported

If an address supports several assets, make those assets discoverable.

For example:

> **3 assets supported**\
> USDC, USDT, ETH

or allow the user to open an asset selector.

If the list is large, showing the number of supported assets and providing a dedicated selection screen is better than displaying a long list next to the address.

The important part is that users should never interpret the address as supporting every asset available on the network.

### Example of a good integration

A good deposit experience combines the relevant information in one place:

* source network is clearly visible;
* supported assets are explicitly indicated;
* the user selects the asset they expect to receive;
* the deposit address and QR code are shown;
* fees and estimated deposit time are visible;
* transfer requirements appear directly below the address;
* minimum deposit and other restrictions are clearly stated.

This provides enough information for the user to understand how to make a valid deposit without overwhelming them with technical details.

The goal is not to add more warnings. The goal is to remove ambiguity.

### Core principle

**Users should never have to infer what can be sent to an Intents Deposit address.**

An Intents Deposit address should always be presented along with its supported network, supported asset (s), and any relevant transfer requirements.

If sending an unsupported asset can result in loss of funds, that risk should be communicated before the user copies or scans the deposit address.
