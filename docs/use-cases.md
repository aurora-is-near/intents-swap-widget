---
icon: mobile-screen-button
---

# Use cases

Aurora Intents enables a wide range of cross-chain interactions, from simple swaps to fully automated on-chain flows.

This page highlights common use cases and how to implement them.

***

### 🔄 Cross-chain swaps in your app

Let users swap assets across chains directly inside your application.

No bridging, no network switching — just a seamless experience.

#### Typical use cases

* Wallets enabling cross-chain trading
* DeFi apps expanding liquidity access
* Consumer apps simplifying token access

👉 **See a live implementation:**

[**https://swap.nearmobile.app/**](https://swap.nearmobile.app/)<br>

👉 **Best fit:** [Swap Widget](swap-widget/what-is-swap-widget.md)

***

### 💸 Cross-chain deposits

Let users deposit from any chain and asset, while your application receives funds on the target chain.

This removes friction in onboarding and funding flows.

#### Typical use cases

* Prediction markets accepting deposits from any chain
* Neobanks enabling easy top-ups
* RWA platforms onboarding non-crypto-native users

👉 **Try the demo:**\
[https://intents-connect-landing.vercel.app/demo/deposits.html](https://intents-connect-landing.vercel.app/demo/deposits.html)

👉 **Best fit:** [Intents Deposits](/broken/pages/ltTn81ZbsMSwwhqPZybz)

***

### 🏦 Direct deposit into protocols

Go beyond simple deposits, route funds directly into contracts.

Users can deposit from any chain and immediately interact with your protocol.

#### Examples

* Deposit into a lending protocol (e.g. Aave)
* Mint tokenized assets (RWAs)
* Enter yield strategies or vaults

👉 No intermediate steps required: funding and execution happen in one flow.

👉 **Try the demo:**\
[https://intents-connect-landing.vercel.app/demo-tonstakers.html](https://intents-connect-landing.vercel.app/demo-tonstakers.html)

👉 **Best fit:** [Intents Deposits](/broken/pages/ltTn81ZbsMSwwhqPZybz) + [Intents Connect](/broken/pages/ETiitsNKbnDcUtk53eBi)

***

### 📈 Cross-chain yield access

Let users access yield opportunities across chains without moving assets manually.

#### Examples

* Stake assets on another chain
* Access vault strategies across ecosystems
* Rebalance positions across chains

👉 Users don’t need to:

* bridge assets
* switch networks
* understand where yield lives

👉 **Best fit:** [Intents Connect](/broken/pages/ETiitsNKbnDcUtk53eBi)

***

### ⚙️ Custom cross-chain actions

Build fully custom flows where users perform actions across chains in one step.&#x20;

Multiple actions can be bundled and executed in sequence.

#### Examples

* Swap → stake → borrow
* Bridge → then deposit into a vault&#x20;
* Convert → then mint an asset

👉 **Best fit:** [Intents Connect (API)](/broken/pages/ETiitsNKbnDcUtk53eBi)

***

### 🧭 Choosing the right approach

<table><thead><tr><th width="371.0703125">Use case</th><th>Recommended product</th></tr></thead><tbody><tr><td>Add cross-chain swaps widget to your app</td><td><a href="/broken/pages/qc0T1RdEvA8HxEcaOX4y">Swap Widget</a></td></tr><tr><td>Accept cross-chain deposits via a widget</td><td><a href="/broken/pages/ltTn81ZbsMSwwhqPZybz">Intents Deposits</a></td></tr><tr><td>Execute contract actions via a widget</td><td><a href="/broken/pages/ETiitsNKbnDcUtk53eBi">Intents Connect</a></td></tr><tr><td>Build tailored cross-chain flows</td><td><a href="/broken/pages/ETiitsNKbnDcUtk53eBi">Intents Connect API</a></td></tr></tbody></table>

