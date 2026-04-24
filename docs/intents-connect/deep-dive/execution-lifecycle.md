---
icon: rotate
---

# Execution Lifecycle

The execution has different lifecycles, depending on how you interact with the API. Below are different scenarios and states in which the execution status ends up.

### Statuses

| Status                 | Description                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `CREATED`              | In the initial state, the execution is on standby, waiting for a deposit.               |
| `DEPOSIT_PENDING`      | The execution starts.                                                                   |
| `DEPOSIT_PROCESSING`   | The deposit is being processed and is awaiting confirmation.                            |
| `OPERATION_PENDING`    | The deposit has been completed, and the operation has been initiated.                   |
| `OPERATION_PROCESSING` | The operation is being processed and waiting for confirmation on the destination chain. |
| `SUCCESS`              | The execution is successful.                                                            |

### Failure Statuses

|                    |                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `EXPIRED`          | The deposit has expired, create a new execution.                                                      |
| `DEPOSIT_FAILED`   | The deposit has failed and was refunded.                                                              |
| `OPERATION_FAILED` | The operation failed. Retry it, or ask the user for the next steps, such as withdrawal to the source. |

### Inbound execution

In this scenario, the user deposits from the source wallet and executes an operation on the destination chain.

<figure><img src="../../.gitbook/assets/inbound-execution.png" alt="" width="375"><figcaption></figcaption></figure>

### Outbound execution

In this scenario, the user executes an operation on the destination chain and then withdraws the funds to the source.

<figure><img src="../../.gitbook/assets/outbound-execution.png" alt="" width="375"><figcaption></figcaption></figure>

### Destination chain execution

In this scenario, the user executes an operation on the destination chain.

<figure><img src="../../.gitbook/assets/destination-chain-execution.png" alt="" width="375"><figcaption></figcaption></figure>
