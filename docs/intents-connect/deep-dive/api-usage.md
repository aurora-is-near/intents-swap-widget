---
icon: gear-api
---

# API Usage

{% hint style="warning" %}
**Pre-release** — The Intents Connect API is currently in development. If you're interested in early access, get in touch with the team.
{% endhint %}

The Intents Connect API gives developers full programmatic control over cross-chain protocol interactions. Rather than embedding a UI component, you call the API directly — constructing intents, receiving transaction plans, and managing execution from your own backend or application logic.

#### When to use the API

The API is the right integration path if you want to:

* Enable AI agents to perform any operation on the chain
* Build a custom interface around Intents Connect
* Orchestrate cross-chain actions programmatically as part of a larger workflow
* Integrate into a backend system where an embeddable widget is not applicable

If you want a frontend-first integration, the [Intents Connect Widget ](https://docs.intents.aurora.dev/intents-connect-widget/introduction)may be a better starting point.

#### What the API handles

You provide the intent parameters — source chain and wallet, destination chain, target protocol, asset, and amount. The API then:

1. Validates the intent and checks for replay safety
2. Prepares the full transaction plan for the destination chain
3. Estimates gas and quotes fees upfront, before execution
4. Executes on the destination chain via the intermediary account
5. Returns status updates and transaction hashes throughout

#### Get early access

The API is moving toward public availability. To register interest or request early access, contact the team.
