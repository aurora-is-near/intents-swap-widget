---
icon: chart-area
---

# Client Portal

The Aurora Intents Client Portal gives your organization a single place to manage and monitor your Aurora Intents integrations.

Use the portal to:

* Monitor swap volume, transactions, and fees
* View organization and user analytics
* Create and manage API keys
* Manage organization members
* Review configuration changes in the audit log

The portal is scoped to your organization, so the information you see is limited to your own integrations and API keys.

> To access the Client Portal, sign in using your organization account at [https://portal.intents.aurora.dev/](https://portal.intents.aurora.dev/).

### Home

The **Home** page provides a high-level view of activity across your organization's integrations.

The dashboard shows:

* **Total volume** — total transaction volume for the selected period
* **Total swaps** — number of completed swaps
* **Fees earned** — fees generated during the period
* **Active keys** — number of active API keys

The charts below the summary show how volume, fees, and transaction count changed over time.

By default, the dashboard displays activity from the last 30 days.

<figure><img src="../.gitbook/assets/Screenshot 2026-09-04 at 15.14.24.png" alt=""><figcaption></figcaption></figure>

#### Deposit health

Deposit monitoring is being added to the Client Portal as a separate feature. When available, this section will provide information about the status of deposits associated with your organization.

### Analytics

Open **Analytics** to explore your integration activity in more detail.

#### Overview

The **Overview** tab shows aggregate metrics for your organization, including:

* Total volume
* Total swaps
* Fees earned
* Active API keys
* Volume over time
* Fees earned over time
* Transaction count

The **Volume by API key** section shows the activity associated with each API key. This can help distinguish production traffic from development, QA, or other integrations.

Use the date selector to change the reporting period.

Select **Download CSV** to export analytics data.

<figure><img src="../.gitbook/assets/Screenshot 2026-09-04 at 15.15.26.png" alt=""><figcaption></figcaption></figure>

#### User analytics

The **User analytics** tab provides wallet-level usage metrics.

Available metrics include:

* **Unique wallets** — wallets that swapped during the selected period
* **New wallets** — wallets first seen during the period
* **Returning wallets** — previously active wallets that returned
* **30-day retention** — new wallets from the previous period that swapped again
* **Average transaction value**
* **Median transaction value**
* **Average swaps per wallet**
* **Repeat swap rate** — wallets that completed two or more swaps during the period

The **New vs. returning wallets** chart shows how acquisition and repeat usage change over time.

You can also inspect usage by origin and destination chain or asset.

<figure><img src="../.gitbook/assets/Screenshot 2026-09-04 at 15.16.14.png" alt=""><figcaption></figcaption></figure>

### API keys

Open **API keys** to manage the credentials your integrations use.

The API key list shows each key's:

* Name
* Masked key value
* Status
* Creation date

Select **Create API key** to create another key.

Open an existing key to view its configuration and configure its fee rules.

We recommend using separate API keys for production, development, QA, or separate applications. This makes analytics easier to understand and lets you manage each integration independently.

> Keep API keys private. Do not expose an API key in client-side code or commit it to a public repository.

<figure><img src="../.gitbook/assets/Screenshot 2026-09-04 at 15.17.46.png" alt=""><figcaption></figcaption></figure>

### Organization

Open **Organization** to view and manage your organization account.

The page shows your organization profile and its members.

Members are displayed with their:

* Email address
* Role
* Account status

Organization administrators can use **Invite member** to add another team member.

If you need help with onboarding, fee configuration, or your integration, select **Contact Aurora team**.

<figure><img src="../.gitbook/assets/Screenshot 2026-09-04 at 15.18.54.png" alt=""><figcaption></figcaption></figure>

### Audit log

The **Audit log** records changes made to your organization's configuration.

Each entry includes:

* Time of the change
* Actor
* Operation
* Affected resource
* Change details

Recorded operations can include changes to API keys and organization membership.

Select **View** on an entry to inspect the recorded change.

The audit log is useful when investigating configuration changes or determining who modified an integration.

<figure><img src="../.gitbook/assets/Screenshot 2026-09-04 at 15.21.03.png" alt=""><figcaption></figcaption></figure>

### Next steps

After setting up your organization and API keys, continue with the documentation for the Aurora Intents product you are integrating:

* **Intents Swap** — add cross-chain swaps to your application
* **Intents Deposits** — accept deposits from supported chains
* **Intents Connect** — build custom cross-chain execution flows
