---
icon: book
---

# How It Works

{% hint style="warning" %}
**Pre-release** — Details are subject to change as the design is finalised.
{% endhint %}

## User flow

When a user initiates an action through Intents Connect, the following happens:

{% stepper %}
{% step %}
### **The user initiates an action**&#x20;

The user connects to your dApp frontend and selects what they want to do — for example, deposit 100 USDC into Aave on Ethereum — from their Solana wallet.
{% endstep %}

{% step %}
### **Intents Connect constructs the intent**&#x20;

The backend prepares a structured, typed message describing the exact action: the source chain, destination chain, asset, amount, target protocol, fees, expiry, and a nonce to prevent replay. Nothing is ambiguous or open-ended.
{% endstep %}

{% step %}
### **The user signs and deposits**&#x20;

The user signs the intent message from their source wallet and deposits the source asset to the designated deposit address. This signature is the only action required from the user.
{% endstep %}

{% step %}
### **Cross-chain execution**&#x20;

Intents Connect handles the cross-chain swap using [Near Intents](https://docs.near-intents.org/) — converting the source asset into the required destination asset — and funds the intermediary account on the target chain.
{% endstep %}

{% step %}
### **The intermediary account acts**

The intermediary account, authorised by the user's signature and remotely controlled by [Chain Signature](https://docs.near.org/chain-abstraction/chain-signatures/getting-started), executes the target-chain transaction — in this example, depositing USDC into Aave. The user's intent is fulfilled.

The user sees the result in the UI: transaction hashes, status updates, and a clear record of exactly what was executed.
{% endstep %}
{% endstepper %}

## Core concepts

### **Intent**&#x20;

A signed, structured message from the user that authorises a specific cross-chain action. An intent defines exactly what will happen: the chains involved, the asset, the amount, the target protocol, the fees, and an expiry. One intent authorises one bounded outcome — never a general right to move funds.

### **Deposit account**

A deposit account on the source chain is used for operating the cross-chain swap on top of NEAR Intents by temporarily transferring assets to a trusted swapping agent.

### **Intermediary account**

An execution account on the destination chain, derived from the user's identity on the source chain. It holds the destination asset temporarily and executes the target protocol interaction on the user's behalf. Its authorisation is scoped to the specific signed intent — it cannot act outside of it.

### **Transaction planner**&#x20;

The internal component that converts a high-level intent into the concrete sequence of transactions needed on the destination chain. This includes token approvals, permit flows, protocol-specific calldata, and multi-call bundling where supported.

### **Execution lifecycle**&#x20;

Each intent moves through a defined set of states:&#x20;

`CREATED → DEPOSIT_PENDING → DEPOSIT_PROCESSING → OPERATION_PENDING → OPERATION_PROCESSING → SUCCESS`

If execution fails at any point, the system follows a defined failure policy — no funds are silently lost, and recovery paths are documented.

Read more about [execution-lifecycle.md](execution-lifecycle.md "mention").

### **Gas and fees**&#x20;

Intents Connect handles destination-chain gas on the user's behalf. Fees are quoted upfront before the user signs, and the breakdown is always visible: gas estimate, service fee, and the final amount the user can expect to land in the target protocol.
