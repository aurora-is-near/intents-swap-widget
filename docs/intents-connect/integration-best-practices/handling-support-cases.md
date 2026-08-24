---
icon: box-tissue
---

# Handling Support Cases

We have a streamlined process for handling support requests from integrators and their end users.

The goal is to keep user cases in a single support pipeline, ensure the support team has the information needed to investigate, and prevent cases from being lost across chats or other communication channels.

### How to report an issue

All user support cases should be submitted through the Intents Support form:

**https://aurora.dev/intents-support**

Submitting the form creates a support case that is reviewed by the relevant teams.

Please use the form for individual user issues rather than sending cases directly to team members.

### What information to include

Provide as much information as possible when submitting a case. Complete reports are significantly easier to investigate and usually require fewer follow-up questions.

Include:

* **Transaction hash(es)** for the affected transaction
* **Deposit address**

As well as any additional information, if it's available:

* **Error message** shown to the user
* A description of **what the user expected to happen**
* A description of **what actually happened**
* Any other identifiers or technical details that may help trace the issue

Do not include private keys, seed phrases, passwords, or other credentials.

### Example of a useful report

**Issue:** User deposited funds but hasn't received them on the destination chain after some time.

> **Transaction hash:** `0x...` \
> **Deposit address:** `0x...`\
> **Route:** NEAR → Ethereum **Assets:** USDC → USDC\
> **Amount:** 100 USDC
>
> User has not yet received the funds, even after waiting for 1 hour.

This level of detail gives the support team enough information to begin investigating the case immediately.

### What happens after submission

1. The report is submitted through the Intents Support form.
2. A support case is created.
3. The support team reviews the case and the information provided.
4. The issue is investigated and routed to the appropriate team when needed.
5. Updates are handled through the support case so that the investigation remains in one place.

### Guidance for integrators

If one of your users reports an issue, collect the relevant transaction and error details and submit the case through the support form.

For transaction-specific incidents, avoid opening the same case through several channels at once. Keeping the investigation in the support pipeline makes ownership and status easier to track and reduces duplicated work.

**Report an Intents issue:** https://aurora.dev/intents-support
