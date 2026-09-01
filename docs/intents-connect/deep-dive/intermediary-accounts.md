---
icon: clipboard-user
---

# Intermediary Accounts

An Intermediary Account is the destination-chain account that Intents Connect uses when a user's connected wallet cannot directly sign transactions on that chain.

The account is fully controlled by the user's origin/source wallet. Intents Connect does not own it and has no independent authority to move funds from it.

Intents Connect uses the Intermediary Account to give the user a destination-chain execution identity without requiring them to manually bridge, switch wallets, acquire destination-chain gas, or sign native destination-chain transactions.

The core security principle is:

> The source wallet remains the root of control, while Intents Connect handles the execution complexity.

### Why it exists

A user can control a wallet on Solana while interacting with an application on Ethereum, Base, or another chain.

Their source wallet does not natively:

* sign destination-chain transactions;
* approve destination-chain tokens;
* call destination smart contracts;
* manage destination-chain gas.

The Intermediary Account provides the destination-chain execution capability.

It can:

* receive assets on the destination chain;
* execute destination-chain calls authorized by the source wallet;
* receive the result of the operation.

Intents Connect handles the gas and execution infrastructure required to perform those operations.

### Where it sits

```
Source wallet
    |
    | authorizes operation
    v
Intents Connect
    |
    | validates authorization
    | builds execution plan
    | handles destination gas
    | coordinates execution
    v
Intermediary Account
    |
    | controlled by source wallet
    | executes authorized calls
    v
Target protocol
```

The source wallet defines what is authorized.

The Intermediary Account provides destination-chain capability.

Intents Connect prepares and facilitates the execution.

These responsibilities are separate by design.

### Account ownership

The Intermediary Account is fully controlled by the user's origin/source wallet.

Intents Connect does not own the account and cannot independently move funds from it.

Any destination-chain action originates from an authorization rooted in the source wallet.

The implementation can use different destination-chain account technologies, including chain signatures, MPC, smart accounts, or account abstraction, but the ownership model remains the same:

> The source wallet is the root of control for the Intermediary Account.

Intents Connect prepares transactions, provides gas, and facilitates execution, but it does not gain ownership of the account.

The mapping between the source wallet and the Intermediary Account is deterministic, allowing the user's destination-chain account to be derived consistently.

### Authorization boundary

Every execution is bound to the operation authorized by the user.

For example:

```
Swap up to 100 USDC
on Base
for at least 250 AERO
before expiry T
with total fees no greater than X
```

The authorization does not give Intents Connect general permission to move funds.

It binds the execution to the relevant parameters, including:

* source wallet;
* destination chain;
* asset and amount;
* receiver;
* operation type;
* execution path;
* maximum fees;
* expiry;
* nonce.

Intents Connect cannot expand these permissions during execution or retries.

### Typical execution flow

Example: a user holds SOL on Solana and wants AERO on Base.

```
1. User requests SOL → AERO.

2. Intents Connect prepares:
   - the quote;
   - deposit instructions;
   - the Intermediary Account;
   - the destination execution plan;
   - the required gas and fees.

3. The source wallet authorizes the operation.

4. The user deposits SOL.

5. The required destination asset reaches
   the Intermediary Account on Base.

6. Intents Connect provides the destination gas.

7. The authorized destination transaction executes.

8. AERO settles in the Intermediary Account.
```

The user does not need to obtain ETH on Base, switch to Base, or manually submit the destination transaction.

### Secure execution

Intents Connect coordinates destination-chain execution without taking control of the Intermediary Account.

The source wallet remains the root of control throughout the flow.

Intents Connect:

* validates the user's authorization;
* constructs the destination transaction;
* calculates and provides gas;
* submits the authorized execution;
* tracks the result.

Intents Connect cannot use the Intermediary Account independently of the authorization provided by the source wallet.

This keeps account control with the user while allowing Intents Connect to abstract away the complexity of destination chains.

### Transaction execution

An operation can require multiple destination-chain calls, for example:

```
approve
→
protocol call
```

or:

```
permit
→
protocol call
```

The transaction planner converts the user's operation into a deterministic ordered transaction plan.

The plan includes:

* destination contracts;
* calldata;
* token permissions;
* execution order;
* gas requirements;
* expected outcome.

Protocol-specific execution logic is handled through supported protocol adapters.

### Simulation

Intents Connect simulates destination transactions before broadcast.

Simulation verifies conditions such as:

* available balance;
* token allowance;
* calldata validity;
* protocol execution;
* gas requirements;
* authorization validity;
* protocol availability.

This prevents Intents Connect from funding and broadcasting transactions that are already expected to fail.

Blockchain state can still change between simulation and execution, so failures remain possible, but simulation removes many avoidable failure cases.

### Gas and fees

Intents Connect handles destination-chain gas.

The user does not need to:

* hold the native gas token on the destination chain;
* bridge a gas asset separately;
* fund the Intermediary Account with gas;
* estimate gas;
* submit a separate gas transaction.

For example, a user interacting with Base does not need to acquire ETH on Base before using the destination application.

Intents Connect:

* estimates the required gas;
* provides the gas required for execution;
* accounts for gas in the operation economics;
* handles gas-price variation;
* enforces the fee limits authorized by the user.

Gas and applicable execution fees are reflected in the quote.

Destination gas remains an Intents Connect execution responsibility, not a user prerequisite.

### Token permissions

Intents Connect minimizes the persistence of token permissions on the Intermediary Account.

Execution uses bounded authorization mechanisms such as:

* exact-amount approvals;
* short-lived permits;
* EIP-2612;
* Permit2 with bounded permissions;
* transaction-scoped authorization.

The Intermediary Account does not accumulate unnecessary unlimited approvals.

Token permissions remain tied to the destination operations authorized through the source wallet.

### Residual balances

Assets can remain in the Intermediary Account after an operation because of:

* unused input assets;
* refunds;
* rounding;
* partial execution.

These assets remain under the control of the source wallet.

Intents Connect does not gain ownership of residual balances.

Recovery and withdrawal operations remain rooted in source-wallet authorization, and Intents Connect handles the destination-chain gas required to execute them.

The user does not need to acquire the destination gas to recover their assets.

### Failure handling

Cross-chain operations cannot always be rolled back.

For example:

```
source deposit       ✓
destination funding  ✓
USDC received        ✓
DEX interaction      ✗
```

At this point, the destination assets already exist in the Intermediary Account.

They remain controlled by the source wallet.

Intents Connect tracks the execution lifecycle through states such as:

```
RECEIVED
VALIDATED
PLANNED
FUNDED
BROADCAST
CONFIRMED
FAILED
REFUND_PENDING
RECOVERY_REQUIRED
COMPLETED
```

When recovery is required, Intents Connect prepares and funds the recovery execution while the source wallet remains the root of authorization.

### Replay protection and retries

Every authorization includes replay protection.

An intent transitions through defined states such as:

```
unused
consumed
expired
cancelled
```

A completed authorization cannot be executed again.

Retries remain inside the original authorization boundary.

A retry cannot:

* increase the authorized amount;
* change the receiver;
* execute the operation twice;
* switch to an unauthorized protocol;
* create broader permissions.

If a retry requires additional destination-chain gas, Intents Connect handles it.

### Intermediary Account vs deposit address

The Intermediary Account is not the same as a deposit address.

```
Deposit address
    ↓
cross-chain transfer
    ↓
Intermediary Account
    ↓
destination protocol
```

The deposit address is used to initiate the flow of assets.

The Intermediary Account is the user's destination-chain execution account, controlled by the source wallet.

Intents Connect handles the infrastructure required to connect these steps.

### Security properties

The Intermediary Account model provides the following guarantees:

* The source wallet has full control over the Intermediary Account.
* Intents Connect does not independently control user funds.
* Every execution is bound to a user-authorized operation.
* Authorizations cannot be reused unexpectedly.
* Destination gas is handled by Intents Connect.
* Gas sponsorship does not grant Intents Connect control over the account.
* Token permissions are bounded.
* Transaction plans are reproducible and auditable.
* Residual assets remain under the control of the source wallet.
* Partial failures preserve a recovery path.
* Recovery does not require the user to acquire destination gas.

### User experience

The Intermediary Account remains largely invisible to the user during normal operation.

The experience is:

```
Choose operation
→
Review quote
→
Sign with source wallet
→
Done
```

The user does not need to:

```
Bridge manually
→
Acquire destination gas
→
Switch network
→
Fund another wallet
→
Approve manually
→
Submit destination transaction
```

Intents Connect handles those destination-chain requirements while the source wallet remains in control.

### Summary

The Intermediary Account is the user's execution identity on the destination chain.

It is fully controlled by the origin/source wallet.

Intents Connect uses it to execute the operation authorized by the user while handling destination-chain gas, transaction construction, submission, and execution tracking.

The model is:

```
Source wallet controls the account.

User authorization defines the operation.

Intents Connect prepares, funds and facilitates execution.

The Intermediary Account executes on the destination chain.
```

This gives users the UX of cross-chain execution without giving Intents Connect independent control over their destination-chain account or assets.
