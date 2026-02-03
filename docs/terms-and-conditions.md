**AURORA SWAP WIDGET-  INTEGRATOR TERMS AND CONDITIONS**

Last updated: January 2026

**Effective Date:** These Terms and Conditions (the **“Terms”**) are effective as of (i) the date on which you electronically accept these Terms, or (ii) the first date on which you access or use any Integration Solution.

BY ACCESSING THE WIDGET CONFIGURATOR, ACCEPTING THESE TERMS, RECEIVING AN API KEY, GENERATING AN EMBED CODE, OR INTEGRATING THE AURORA SWAP WIDGET INTO ANY APPLICATION OR WEBSITE, YOU AGREE TO BE LEGALLY BOUND BY THESE TERMS. 

IF YOU DO NOT AGREE, YOU ARE NOT AUTHORIZED TO ACCESS OR USE ANY OF OUR INTEGRATION SOLUTIONS AND SHOULD NOT USE OUR INTEGRATION SOLUTIONS.

1. **PARTIES AND PURPOSE**

This Agreement is entered into between **Aurora Labs Limited** ("**Aurora**", “**we**”, “**us**”) and the Integrator ("**Integrator**", “**you**”). These Terms govern your access to and use of the Aurora Swap Widget, the Widget Configurator, related APIs and SDKs, and other tooling (collectively, the **“Integration Solutions”**) enabling interaction with the NEAR Intents Protocol.

2. **DEFINITIONS**

Unless the context requires otherwise, capitalised terms have the meanings set out below:

1. **“API” \-** the application programming interface (including any SDKs, keys and documentation) that we make available for the purpose of integrating the Integration Solution functionalities into Your Platform.

   2. **“API Integration**” \- an integration effected using the API.

   3. **“Confidential Information” \-** any non-public information, in any form, disclosed by one party (“**Discloser**”) to the other (“**Recipient**”) that is designated confidential or that a reasonable person would understand to be confidential, including the content of these Terms, non public technical information, business plans, financial data and End-User data.

   4. **Configurator:** The web-based tool provided by Aurora to customize the Widget's appearance and generate implementation code.

   5. **“End User**” \- a person that accesses the Underlying Technology functionalities via the Aurora Swap Widget integrated into Your Platform.

   6. **“Infrastructure Fee"** \- the fee that Aurora retains to cover operational and infrastructure costs. This fee is automaticaly deducted from the Partner Fee pool and applied uniformly across all Integrators (subject to public volume tiers). The Integrator is responsible for understanding and accepting this fee structure. 

   7. **Near Intents Protocol** \- means the decentralized universal settlement protocol using JSON-structured requests processed by competing and compatible solvers to execute cross-chain and off-chain interactions and transactions leveraging one or more component(s) of the NEAR technology stack, enabling AI-driven automation and seamless actions (including asset transfers) across multiple blockchains, known as “NEAR Intents”, further details of which can be found at [https://docs.near-intents.org/near-intents](https://docs.near-intents.org/near-intents); 

   8. **“Partner Fee”** – The gross fee amount designated and configured solely by the Integrator via the Configurator to be applied to a transaction. For the avoidance of doubt, the Integrator acknowledges that they have sole discretion over the setting of this fee, subject to any technical floors or caps set forth in the Fee Policy Schedule.

   9. **“Net Partner Fee”** – The residual portion of the Partner Fee actually collected and settled in respect of a Qualified Transaction, calculated as:

   10. *Net Partner Fee \= Partner Fee−Infrastructure Fee*

   11. The Net Partner Fee represents the final amount due to the Integrator, and the Platform shall have no obligation to remit any portion of the Infrastructure Fee.

   12. **"API Key"** \- The unique, non-transferable alphanumeric identifier assigned to the Integrator upon successful registration and email authentication via the Widget Configurator. The Integrator is solely responsible for the security of its API Key. Any transaction processed using the Integrator's API Key shall be deemed to have been authorized by the Integrator, and the Platform shall have no liability for an unauthorized access resulting from the compromise of said Key.

   13. **Sanctions Laws”** means any economic, financial, or trade sanctions, embargoes, restrictive measures, or similar laws or regulations administered, enacted, or enforced by any relevant governmental authority, including, without limitation, the United Nations Security Council, the United States government (including the U.S. Department of the Treasury’s Office of Foreign Assets Control (OFAC)), the European Union, His Majesty’s Treasury of the United Kingdom, and any other applicable sanctions authority.

   14. “**Qualified Transaction**” \- means a transaction that:

       (a) originates from Your Platform;

       (b) correctly includes Your API Key and fee parameters;

       (c) is submitted for settlement via the Integration Solutions; and

       (d) results in the collection of fees.

       For purposes of fee calculations:

* If a Qualified Transaction is blocked by a Third Party Service KYT screening before settlement, no fee is collected by You, but the transaction may be re-attempted.  
* If a Qualified Transaction is settled but later identified as violating Sanctions Laws, you shall refund collected fees within thirty (30) days.  
* A transaction shall not be deemed a Qualified Transaction if it is subsequently determined to have violated Sanctions Laws or AML regulations.

  15. “**Term**” \- the period commencing on the Effective Date and continuing until terminated in accordance with Section 15\.

  16. “**ETH**” \- the native cryptocurrency of the Ethereum blockchain.

  17. “**Near**” \- the native cryptocurrency in Near blockchain.

  18. **Widget:** The front-end React component or iframe provided by Aurora to enable  Integrator to permit its End-Users to interact with the NEAR Intents Protocol.

  19. **Widget Configurator:** the web-based tool used to customize the Widget and generate integration code, including Fee Parameters.

  20. “**Widget Integration**” \- an integration effected using the Widget.

  21. “**Your Platform**” \- means any digital interface where you have configured the Widget using your API Key. If you permit third parties to access the Widget on your platform, you remain fully responsible for their compliance with these Terms.

3. **NATURE OF THE SERVICES**

   1. Purely Technical Role: Aurora provides software and technical infrastructure only. Aurora’s role is strictly limited to:

      1. providing interface software (the Widget) that access Third-Party Services;

      2. providing configuration tooling (Configurator and APIs) that allows Integrators to customize appearance and fee parameters;

      3. Routing End User transactions to the Third Party Services via APIs and smart contracts.

   2. KYT IS NOT PERFORMED BY AURORA: Third Party Services may include automated Know-Your-Transaction (KYT) screening as a component of the underlying protocol infrastructure. Aurora does NOT: 1\) Write the KYT logic, 2\) Control the KYT screening rules, 3\) Update the sanctions lists, 4\) Make KYC determinations, 5\) Maintain End User accounts and 6\) Store End User data

   3. No Financial Intermediation: Aurora does not, under any circumstances:

      1. execute, settle, clear, or guarantee transactions;

      2. custody, safeguard, or control digital assets or private keys;

      3. intermediate payments, exchanges, or transfers of value;

      4. act as agent, broker, dealer, exchange, or money services business;

      5. act “on behalf of” End Users in any transactional capacity.

   4. All transactions are initiated by End Users, cryptographically signed by End Users, and executed directly by decentralized smart contracts and solvers.

   5. No User Relationship or Compliance Agency: Aurora does not:

      1. onboard, approve, reject, suspend, or terminate  your End Users;

      2. perform KYC, KYB, AML, CTF, or sanctions screening on your End Users;

      3. monitor user behaviour for regulatory compliance purposes;

      4. maintain accounts, balances, or transaction histories for End Users.

   6. The Integrator is solely responsible for its relationship with End Users, including disclosures, support, compliance obligations, and regulatory classification.

   7. Protocol Integrity Measures (Non-Regulatory):

      1. Aurora may suspend or revoke an API Key under the following conditions:

         1. Confirmed phishing, malware, or fraudulent activity (with documentary evidence);

         2. Clear violation of Sanctions Law;

         3. Repeated breach of these Terms (after written notice and 5-day cure period);

         4. Emergency security incident requiring immediate action, except in emergency circumstances under which Aurora shall: (1) Provide written notice specifying the violation (2) Allow a 5-day cure period (3) Offer a hearing/explanation opportunity (4) Explain the specific bases for revocation; 

         5. Emergency revocations (immediate, without notice) may occur only when: (1) Aurora reasonably believes imminent harm would result from delay (2) Aurora shall provide notice within 24 hours of emergency action (3) Aurora shall provide a hearing opportunity within 7 days 

         6. Integrators may appeal any revocation by email.

   8. No Fiduciary, Custodial, or Advisory Duty: Aurora owes no fiduciary duty, no custodial duty, and no advisory duty to Integrators or End Users. Aurora does not provide investment advice, trading advice, legal advice, or compliance advice.

   9. Third Party Services. The integration may enable technical interoperability with, or access to, protocols, blockchains, smart contracts, networks, APIs, infrastructure, or other services that are provided, deployed, or operated by independent third parties (“**Third-Party Services**”). Aurora does not operate, control, custody, clear, settle, intermediate, broker, facilitate, or execute any transactions conducted through or in connection with such Third-Party Services, nor does it act as a financial institution, virtual asset service provider, payment service provider, broker, dealer, custodian, or other regulated intermediary in any jurisdiction. All Third-Party Services may be made available on an “as-is” and “as-available” basis and may be subject to separate terms, conditions, licences, or policies imposed by the relevant third-party providers. Aurora does not endorse, warrant, or assume responsibility for the availability, security, functionality, compliance, or operation of any Third-Party Services and shall have no liability for any acts or omissions of third-party providers, including service interruptions, protocol changes, regulatory actions, or losses arising from the use of Third-Party Services.

   10. Protocol Access. Aurora has obtained the necessary rights and permissions to enable Integrators and its End Users to interact with the NEAR Intents Protocol through the Integration Solutions. Such access is provided as part of the software license granted herein. Aurora does not charge separately for protocol access, and the Infrastructure Fee relates solely to Aurora's software and services, not to protocol usage rights.

4. **GRANT OF LICENSE** 

   1. Aurora Swap Widget, the Widget Configurator, related APIs and SDKs are made available under a Business Source License (“**BSL**”), as specified in the applicable license file or documentation. 

   2. Under the BSL, Aurora grants the Integrator a limited, non-exclusive, non-transferable, revocable license to use the Integration Solutions solely for the purposes permitted under these Terms.

   3. BSL Terms: Use of the Widget is also subject to the Business Source License attached as Exhibit A. In the event of conflict between these Terms and the BSL, the more restrictive provision shall apply. Integrators have 5 days to review the BSL before accepting these Terms.

   4. Eligibility: You must satisfy any eligibility criteria published in the documentation and comply with these Terms at all times. 

   5. Non-exclusive appointment: Subject to this Section, we grant you and you accept a non-exclusive, worldwide right to use the Integration Solutions during the Term solely for the purpose of making the Integration Solutions functionalities available to End Users via Your Platform. Nothing in these Terms restricts us from authorising others to do the same, or from offering services.

   6. Permitted Use: Subject to compliance with these Terms and the BSL, the Integrator may:

      1. embed the Widget into Your Platform;

      2. configure display and fee parameters using the Configurator;

      3. enable End Users to submit intents to the NEAR Intents Protocol via the Widget.

   7. **RESTRICTIONS**

      1. Except as expressly permitted, the Integrator shall not:

      2. copy, modify, or create derivative works of the Widget;

      3. reverse engineer, decompile, or attempt to extract source code;

      4. use the Integration Solutions to build a competing product or service;

      5. and shall implement technology to prevent: (a) Use of the Widget by any person subject to Sanctions Law (b) Transfer of assets to addresses in Sanctions Law jurisdictions (c) Facilitation of transactions for entities in Sanctions Law countries (Iran, North Korea, Syria, Crimea, and others) 

      6. remove or obscure proprietary notices or license headers;

      7. sublicense, resell, lease, or make the Integration Solutions available to third parties, (other than End Users accessing via Your Platform);

      8. Interfere with the fee-tracking mechanism or the attribution of transactions, provided that Integrator may request fee audits and dispute fee calculations. Integrator is not interfering by requesting a fee review.

      9. All rights not expressly granted are reserved and not to Aurora. We may suspend or revoke this license at any time if we reasonably believe that you are in breach or that suspension is necessary to protect the integrity or security of Integration Solutions.

      10. infringe any third-party rights;

      11. submit fraudulent or manipulative Orders;

      12. introduce malicious code or attack the Integration Solutions, NEAR Intents Protocol or related infrastructure;

      13. misrepresent your relationship with us.

5. **YOUR OBLIGATIONS**

   1. Technical implementation. Integrations must strictly follow the then-current documentation;

      1. Fee Attribution. Fees are calculated and applied based on the specific API Key and Fee Parameters and the associated fee structure configured by you within the Integration Solution.

      2. You are solely responsible for your own systems, configurations (including payout addresses) and any losses arising therefrom.

   2. Maintenance and updates**.** You must keep Your Platform compatible with the latest version of the Integration Solution(s) and implement all security patches and updates promptly.

   3. Transparency**.** You must:

      1. prominently disclose all fees (including any Partner Fee) to End Users before an Order is submitted;

      2. clearly display *“Powered by Aurora labs”*, or similar wording as provided from time to time by Aurora, to the End User prior to the End User submitting an Order through the Integration Solution(s) on the Partner’s Platform; and

      3. display a notice that use of the Near Intents Protocol is subject to the Near Intents Terms and Conditions (available at [https://near-intents.org/terms-of-service](https://near-intents.org/terms-of-service)/ or any successor URL).

   4. Data protection. You act as the data controller for any personal data you collect. You must:

      1. Comply with all applicable data protection laws (GDPR, CCPA, etc.);

      2. Maintain an accurate and comprehensive privacy policy;

      3. Obtain proper user consent where required;

      4. Not share End User personal data with Aurora unless explicitly required by law.

      5. For our Privacy Policy please check XX.

   5. Security. You will implement reasonable technical and organizational measures to protect Your Platform and its users. You are responsible for the secure hosting of Your Platform. Aurora does not host or manage your infrastructure.

   6. Issue reporting. You must promptly report any bugs, security vulnerabilities, or issues you discover in the Integration Solutions to Aurora via the documented security disclosure process.

   7. Additional fees levied by you. If you impose any additional fees on End Users, you must:

      1. disclose them clearly as your own fees and distinctly from ours or Protocol Fees,

      2. ensure compliance with all laws, and

      3. accept sole responsibility for them.

   8. End-User Relationship and Support. You are solely responsible for:

      1. Your relationship with End Users;

      2. Providing customer support to End Users;

      3. Addressing End User complaints, inquiries, and disputes;

      4. Handling refund or dispute resolution requests.

      5. You will not direct End Users to Aurora for matters within your control or responsibility.

6. **OUR OBLIGATIONS**

   1. Provision of Integration Solutions. We will make the Integration Solution(s) available on an “AS IS” and “AS AVAILABLE” basis. We make no warranties regarding uninterrupted uptime, absence of bugs or errors, price execution by solvers, suitability for any particular purpose.

7. **ONBOARDING AND ACCESS FLOW**

   1. Acceptance of these Terms is the sole prerequisite for access to the Integration Solutions.

   2. Issuance of an API Key:

      1. is purely technical;

      2. does not constitute approval, endorsement, or authorization;

      3. does not create a partnership, agency, or joint venture.

8. **FEES**

   1. **Partner Fee**

      1. Setting the Fee: As the Integrator, you are solely responsible for determining your "Partner Fee." Aurora does not set this fee. You will set this fee using Aurora's Widget Configurator tool. The full Partner Fee will be programmatically routed to the wallet address associated with the Integrator’s API Key from a Qualified Transaction.

   2. **Infrastructure Fee**

      1. In consideration for the license to use the Integration Solutions, the Integrator shall pay Aurora a technology Infrastructure Fee for running and maintaining the underlying infrastructure for the Widget.

      2. The Infrastructure Fee is automatically deducted by the smart contract from the Partner Fee (specifically, the Net Partner Fee) after a successful swap (Qualified Transaction) is completed. This Infrastructure Fee is not charged directly to the end-user, but from You.

      3. As an Infrastructure Fee, X percent (X%) of your Partner Fee. 

      4. Fees under this section are not accumulated or held. Distribution occurs automatically within the same transaction. The Integrator's share is routed directly to the wallet address associated with their API Key.

      5. Nature of Infrastructure Fee. The Infrastructure Fee is compensation for Aurora's provision of software, technical infrastructure, and related services. It is not a commission, brokerage fee, revenue share, or participation in transaction proceeds. Aurora does not participate in, execute, intermediate, or profit from the underlying asset exchange. The fee calculation methodology (as a percentage of Partner Fee) is used for convenience and commercial alignment, not as an indicator of any transactional role.

   3. You accept and acknowledge that the Infrastructure Fee covers:

      1. Hosting and operation of the Configurator and Widget;

      2. Technical support and updates;

      3. API access and maintenance and infrastructure cost;

      4. Widget maintenance.

   4. Tiered Pricing. Aurora may apply public, objective, volume-based tiers to its infrastructure allocation, measured on a rolling basis. No individual, discretionary, or client-specific trading discounts are permitted.

   5. Discounts. Integrators may customize pricing (e.g., $0 fee for specific stablecoin pairs), provided they do not reward trading activity in a manner that violates anti-manipulation rules.

   6. Transparency. Integrators must clearly disclose all fees to End Users before any Order is submitted.

   7. API Key Requirement: For the smart contract to attribute the Net Partner Fee, the Integrator’s valid API Key must be correctly embedded in the transaction metadata.

   8. Attribution Failure: If a transaction is submitted without a valid API Key or with incorrect metadata, the smart contract will be unable to identify the Integrator. In such cases, the Integrator Fee will not be collected or may be treated as a protocol-level surplus. The Integrator acknowledges that such fees are unrecoverable.

   9. Tax Obligations: All fees are exclusive of Value Added Tax (VAT) or similar indirect taxes. Where VAT applies, it shall be accounted for by the Integrator under the reverse-charge mechanism, where applicable. Integration Solutions may not be available or appropriate for use in your jurisdiction. By accessing or using any of our Integration Solutions, you agree that you are solely and entirely responsible for compliance with all laws and regulations that may apply to you. Specifically, your use of our Integration Solutions may result in various tax consequences, such as income or capital gains tax, value-added tax, goods and services tax, or sales tax in certain jurisdictions.

9. **INTELLECTUAL PROPERTY**

   1. Ownership: Integrator acknowledges that Aurora owns all rights, titles, and interests in the Widget UI/UX and the Configurator. Third Parties own the NEAR Intents Protocol, 1Click Swap Service, and related trademarks.

   2. **No Transfer:** Nothing in these Terms shall be construed as a transfer of any Intellectual Property rights from Aurora or third- Parties to the Integrator.

10. **COMPLIANCE AND SECURITY**

    1. Transaction Screening: The underlying infrastructure includes automated KYT (Know-Your-Transaction) screening. Aurora is not liable for any transaction that is blocked, delayed, or cancelled by the Underlying Technology.

    2. Nefarious Activity: Aurora monitors Widget usage. If the Widget is found on a site associated with phishing, malware, or fraudulent token sales, Aurora will immediately deactivate the API Key and revoke the license without notice.

    3. Hosting and Data: Integrator is responsible for the secure hosting of their own site. Aurora does not collect or store end-user private keys or personal data through the Widget.

11. **CONFIDENTIALITY**

    1. Each party (the “**Recipient**”) shall:

    2. use the other party’s (“**Discloser**”) Confidential Information solely for the purpose of performing its obligations or exercising its rights under these Terms;

    3. protect such Confidential Information using at least the same degree of care it uses to protect its own confidential information of a similar nature, and in no event less than reasonable care; and

    4. not disclose such Confidential Information to any third party except to its employees, contractors, or professional advisers who have a need to know and are bound by confidentiality obligations no less protective than those set out herein.

    5. Exclusions. Confidential Information does not include information that the Recipient can demonstrate:

       1. was lawfully known to the Recipient prior to disclosure;

       2. becomes publicly available through no breach of these Terms;

       3. is rightfully received from a third party without restriction; or

       4. is independently developed without use of or reference to the Confidential Information.

    6. Compelled Disclosure. The Recipient may disclose Confidential Information where required by law, regulation, or court order, provided that, to the extent legally permissible, the Recipient gives the Discloser prompt written notice to allow the Discloser to seek protective relief.

    7. Duration and Survival. Confidentiality obligations shall survive termination of these Terms for five (5) years, or indefinitely with respect to trade secrets. Upon termination, each party shall promptly return or securely destroy the other party’s Confidential Information, subject to lawful retention requirements.

12. **SECURITY AND TRANSPARENCY**

    1. Security Controls. The Integrator shall implement and maintain industry-standard technical and organisational security measures appropriate to the nature of its Platform and the Integration Solutions.

    2. Incident Notification. The Integrator shall notify Aurora without undue delay and in any event within forty-eight (48) hours of becoming aware of any actual or suspected security incident that materially affects the Integration Solutions, the API Key, or fee attribution mechanisms.

13. **DISCLAIMERS AND LIMITATION OF LIABILITY**

    1. "As-Is" Basis: The Widget and Configurator are provided as "as-is" and "as-available." Aurora makes no warranties regarding the uptime of the Underlying Technology or the price execution provided by solvers.

    2. Non-Custodial Nature: Aurora is a software provider, not a financial intermediary. All transactions are peer-to-protocol.

    3. Protocol Disclaimer. Aurora does not operate, control, or guarantee the Underlying Technology, or any solver infrastructure. Use of such protocols by the Integrator and End Users is at their own risk.

    4. Slippage and Execution Risk. Aurora does not guarantee:

       1. Best execution;

       2. Lowest slippage;

       3. Favorable pricing;

       4. Immediate settlement.

    5. Cap on Liability: To the maximum extent permitted by law, Aurora’s total liability for any claim arising out of these Terms shall not exceed the fees paid in prior 12 months. 

14. **INDEMNIFICATION**

    1. The Integrator shall indemnify, defend, and hold harmless Aurora, its affiliates, directors, officers, employees, and contractors from and against any losses, damages, liabilities, costs, and expenses (including reasonable legal fees) arising out of or relating to:

       1. the Integrator’s breach of these Terms;

       2. the Integrator’s Platform or its operation;

       3. any claim by an End User or third party relating to the Integrator’s services, disclosures, or fees;

       4. the Integrator’s violation of applicable law; 

       5. The Integrator's failure to comply with sanctions or compliance obligations;

       6. Any claim arising from the Integrator's use or misuse of the Integration Solutions or

       7. the Integrator’s negligence, wilful misconduct, or misrepresentation.

15. **TERMINATION**

    1. By Aurora: Aurora may terminate this Agreement and revoke the Widget license at any time for any reason, with thirty (30) days' notice, or immediately for breach of any clause of this Agreement. For avoidance of doubts, Aurora will use commercially reasonable efforts to provide advance notice except where immediate termination is required to protect system integrity, security, or comply with law.

    2. Effects of Termination. Upon termination:

       1. all licenses granted herein immediately cease;

       2. the Integrator shall remove the Integration Solutions and cease representing itself as an Aurora integrator;

       3. balances below the payout threshold may be forfeited; and

       4. Sections intended to survive termination shall remain in effect, including Confidentiality, IP, Disclaimers, Indemnification, and Limitation of Liability.

16. **GOVERNING LAW AND DISPUTE RESOLUTION**

    1. These Terms and any non-contractual obligations arising out of or in connection with them shall be governed by and construed in accordance with the laws of Gibraltar, without regard to conflict-of-laws principles.

    2. Amicable Resolution.  The parties shall use reasonable efforts to resolve any dispute amicably. The Integrator shall notify Aurora in writing of any dispute and allow at least thirty (30) days for good-faith negotiations. If a potential dispute arises, you must contact us by sending an email to [legal@aurora.dev](mailto:legal@aurora.dev)  so that we can attempt to resolve it without resorting to formal dispute resolution.

    3. Arbitration. If the dispute is not resolved amicably, it shall be finally settled by arbitration seated in Gibraltar, conducted in English, under the LCIA Arbitration Rules (or, alternatively, UNCITRAL rules if preferred). The arbitral award shall be final and binding.

    4. Waiver of Class Actions and Jury Trial. To the fullest extent permitted by law, each party irrevocably waives any right to a jury trial or to participate in any class, collective, or representative proceeding.

17. **BLOCKCHAIN TRANSPARENCY**

    1. The Integrator acknowledges that:

       1. Transactions executed on public blockchains are inherently transparent;

       2. Payout transactions, including wallet addresses and amounts, will be publicly visible on-chain;

       3. Aurora shall have no responsibility for any consequences arising from such transparency;

       4. Integrators may wish to use privacy measures (e.g., multi-sig wallets) at their own discretion.

18. **MISCELLANEOUS**

    1. Entire Agreement. These Terms constitute the entire agreement between the parties regarding their subject matter.

    2. Amendments. Aurora may amend these Terms by posting an updated version or providing notice. Continued use of the Integration Solutions constitutes acceptance of the amended Terms.

    3. Assignment. The Integrator may not assign these Terms without Aurora’s prior written consent. Aurora may assign freely, including in connection with a corporate reorganisation or asset transfer.

    4. Independent Contractors. The parties are independent contractors. Nothing herein creates a partnership, agency, joint venture, fiduciary, or employment relationship.

    5. Severability. If any provision is held unenforceable, it shall be enforced to the maximum extent permissible, and the remaining provisions shall remain in full force.

    6. Waiver. No waiver is effective unless in writing and signed. A waiver of one breach is not a waiver of any other breach.

    7. Modifications: We reserve the right, in our sole discretion, to modify this Agreement from time to time. If we make any material modifications, we will notify you by updating the date at the top of the Agreement and by maintaining a current version of the Agreement.

    8. All modifications will be effective when they are posted, and your continued accessing or use of any of the Integrated Solutions will serve as confirmation of your acceptance of those modifications. If you do not agree with any modifications to this Agreement, you must immediately stop accessing and using all of our Integrated Solutions.