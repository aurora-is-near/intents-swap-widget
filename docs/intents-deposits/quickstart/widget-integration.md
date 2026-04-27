---
icon: palette
---

# Widget integration

{% hint style="info" %}
### Try it out in the Studio

You can check out the Deposit Widget in the [**Intents Widget Studio**](https://intents.aurora.dev/?configId=8cb195f4-f1ae-45cb-9726-43830954d029). It uses [USDC on Base](https://basescan.org/token/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913?a=0x195954FBa43C1A4266F5A66B4Fe468f459Fd0611) as the destination asset and our [test EVM account](https://basescan.org/address/0x195954FBa43C1A4266F5A66B4Fe468f459Fd0611) as the recipient.
{% endhint %}

## Step by step

You can embed a ready-to-use **Deposit Widget** directly into your app using an **iframe** or a **React component**.

{% stepper %}
{% step %}
### Create Intents Studio account

Navigate to [Widget Studio](https://intents.aurora.dev/) and log in with your email using the button in the top-right corner of the interface.
{% endstep %}

{% step %}
### Configure the widget

Make sure to use Deposit Widget mode, select the **Destination asset**, and enter the **Receiver address**. Both need to be compatible.

In the UI, you can configure settings such as the displayed Networks and Tokens, and how the Wallet Connection is handled.
{% endstep %}

{% step %}
### Configure the design

You can also customise the design to match your branding with different Styles, Accents, or Layouts. Reach out to our team for more advanced styling options.
{% endstep %}

{% step %}
### Embed the widget

Click the **Embed in your app** button on the top right of the interface, either through:

* An iframe by using **Generate a new link to embed** section
* Or React component using **Use React code snippet**
{% endstep %}

{% step %}
### (Optional) Use advanced settings of the widget

If you decide to embed a React component, you can use advanced settings, such as your own wallet connection or use widget hooks. Check the detailed docs on the [readme-1-1](../../swap-widget/readme-1-1/ "mention").
{% endstep %}
{% endstepper %}
