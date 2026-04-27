---
icon: plug
---

# What is Intents Connect?

Intents Connect lets a user with a wallet on one chain perform actions on a completely different chain - without manual bridging, switching wallets or managing gas on the destination chain.

<figure><img src=".gitbook/assets/image 18.png" alt=""><figcaption></figcaption></figure>

The classic example: a user with a Solana wallet depositing USDC into Aave on Ethereum. Today, that requires bridging funds, switching to an Ethereum wallet, acquiring ETH for gas, and manually completing each step. With Intents Connect, the user signs a single intent from their existing wallet. Everything else is handled.

### **What makes it non-custodial**

The user's signature authorises one specific, bounded outcome. Intents Connect never holds funds or acts beyond what the user has explicitly approved.&#x20;

An intermediary account on the destination chain executes the action, but it is fully owned by the origin wallet and controlled via Chain Signature, an [MPC technology](https://docs.near.org/chain-abstraction/chain-signatures/getting-started) based on Near protocol.

### **Who it's for**

Intents Connect is built for dApps that want to open their protocols to users on any chain, without requiring those users to manage the complexity of cross-chain execution.

It can also be used as an API by apps, backend systems and AI agents who need a straightforward solution to perform any type of operations on the chain.
