# Customer registration consent and privacy dialog copy — draft v0.2

**Status: DRAFT FOR PRODUCT/LEGAL REVIEW — NOT APPROVED FOR CUSTOMER DISPLAY OR PRODUCTION USE.**

This draft is a starting point for review, not legal advice or a compliance determination. It must not be connected to the registration UI, assigned an authoritative version, or used to capture production consent until the accountable Product/Legal owner approves the wording and verifies every operational fact below. Research notes and source links are at the end.

## Proposed dialog 1: ShopCity Credit service processing

**Title:** How ShopCity uses information to provide ShopCity Credit

**Draft body:**

> To create and operate your ShopCity Credit account, ShopCity uses the account details you provide, information that links your loyalty card to your account, and the purchase and wallet records needed to provide and administer the service. This may include your name, phone number, optional email address, card details, and account and transaction activity.
>
> ShopCity uses this information to **[Product/Legal: confirm the specific purposes]**. The lawful basis for each purpose is **[Product/Legal: confirm the applicable basis under the Nigeria Data Protection Act 2023]**. More detail, including who is responsible for your information, who receives it, and how long it is kept, is in the Privacy Notice.

**Conditional choice label — do not publish until the lawful basis is decided:**

> **[If consent is confirmed as the appropriate lawful basis:]** I agree to the processing described above for ShopCity Credit. I understand that I can withdraw this consent using **[approved, working withdrawal method]**. **[Product/Legal must also confirm the consequences, if any, of declining.]**

> **[If processing is necessary to provide the requested service under another lawful basis:]** Do not describe this required service processing as optional consent. Replace the consent checkbox with an accurate notice/acknowledgment, or retain an affirmative consent control only if Product/Legal confirms it is freely given and legally appropriate. Align the API field and stored evidence with that decision before changing production behavior.

### Review blockers for this dialog

- Confirm whether the existing required `loyaltyConsent` checkbox is legally appropriate. The current implementation requires `true` to register; this draft does not endorse that design or change its behavior.
- Confirm the exact purposes and data categories. The current form collects name, phone, optional email, and initial card serial; the loyalty service also creates/uses account, purchase, and wallet records.
- Confirm the lawful basis per purpose and explain what happens if a person declines any consent that is genuinely necessary.
- Decide whether the checkbox records consent or merely acknowledges a notice. Do not label one as the other.
- The in-store implementation records an append-only opt-out event and updates ShopCity’s effective preference; separate external marketing lists are to be updated manually. Do not imply automatic synchronization, and verify the manual process and coverage of marketing senders before launch.

## Proposed dialog 2: Privacy Notice

**Title:** ShopCity Credit Privacy Notice

**Version/effective date:** **[Approved version and effective date]**

**Draft body:**

### Who is responsible

ShopCity **[full legal entity name]**, of **[registered/business address]**, is responsible for the personal information described in this notice. You can contact us about privacy at **[working privacy email, phone number, postal address, or other accessible channel]**.

### Information we use

For registration and ShopCity Credit, we may use your name, phone number, optional email address, loyalty-card details, account and transaction records, and the loyalty and marketing choices you make. **[Product/Legal and Engineering: confirm this is complete and accurate, including information obtained from other sources or services.]**

### Why we use it and our lawful bases

We use this information to **[list each verified purpose, such as creating and administering the account, linking the loyalty card, recording eligible activity, maintaining wallet/account records, and providing customer support]**. The lawful basis for each purpose is **[state the verified basis for each purpose; do not assume all processing is based on consent]**.

We use your information for direct marketing only if you have separately opted in. Marketing is optional and is not required to register for ShopCity Credit. If you opt in, we may send ShopCity offers and campaign messages through **[confirm channels; the current registration form names WhatsApp and SMS]**. You can withdraw your marketing consent or object to direct marketing through **[approved, tested request routes]**. **[Product/Legal and Engineering: the cashier-assisted in-store flow records the request in ShopCity; any separate external campaign list is to be updated manually. Confirm which routes are available at launch and verify that every marketing sender and any external list honors the preference before promising that all marketing will stop.]** **[Do not publish this paragraph until routes and suppression behavior have been implemented and verified.]**

### Who receives your information

Your information may be accessed by **[verified categories of authorized ShopCity staff]** and shared with **[verified service-provider/recipient categories and, where appropriate, names]** only for **[verified purposes]**. **[List actual processors and recipients; do not infer them from the technology stack.]**

### Transfers outside Nigeria

**[Confirm whether personal information is transferred or accessed outside Nigeria. If so, describe the relevant destinations and applicable transfer safeguards in wording approved by Product/Legal. If not, state that only after verifying all processors, backups, support access, and subprocessors.]**

### How long we keep information

We keep each category of information for **[approved, operationally accurate period or criteria]**, including any retention required for **[verified legal, accounting, fraud-prevention, or dispute-resolution obligations]**. **[Map this statement to the actual retention and deletion processes. Do not reuse the current “for the life of the account” wording unless the owner verifies that it is accurate and complete.]**

### Your choices and rights

You can ask us to **[confirm the request routes and describe, in clear language, the applicable rights under Part VI of the Nigeria Data Protection Act 2023, including access, correction, deletion where applicable, restriction, portability where applicable, and objection]**. You may withdraw consent where processing is based on consent; withdrawal does not make earlier lawful processing unlawful. You can object at any time to direct marketing. To make a request, contact **[working privacy contact/process]**. You may also complain to the Nigeria Data Protection Commission through **[confirm the Commission’s current complaint channel and give the appropriate link/contact]**.

### Automated decisions

**[Confirm whether ShopCity uses automated decision-making or profiling in connection with registration, account access, loyalty, wallet, or marketing. If it does, describe the logic at a meaningful level, its significance and likely consequences, and how a person can object to and challenge the decision. If it does not, state that only after a system-wide review.]**

### Changes to this notice

This notice is version **[approved version]**, effective **[date]**. If it changes materially, ShopCity will **[describe the verified notice/communication process]**. The version shown when a choice is made will be recorded with that choice.

## Dialog behavior proposal (after approval)

- Provide separate, clearly named **Read about ShopCity Credit consent** and **Read the Privacy Notice** buttons/links beside the relevant choices.
- Open each item in its own accessible dialog with a descriptive title, keyboard-operable close control, focus management, Escape handling, and scrollable content on small screens.
- The marketing choice remains independent, optional, and unchecked by default. Opening or closing either dialog must not change a choice.
- Preserve the approved version and effective date with the choice; do not let the browser submit or override server-owned versions.
- Ensure a customer can access the notice before the relevant data is collected and keep a non-modal, printable/accessibility-friendly version available as well.

## Research basis and important cautions

- The Nigeria Data Protection Act 2023, section 25, lists lawful bases; section 26 covers consent and requires the controller to inform people about withdrawal before consent is given. Do not assume service-required processing must be based on consent.
- Section 27 requires a clear, concise, transparent, intelligible, and accessible privacy policy and specifies information to provide before direct collection, including controller identity/communication means, specific lawful basis and purposes, recipients or recipient categories, rights, retention period, complaint rights, and applicable automated decision-making information.
- Section 35(2) says withdrawal of consent must be as easy as giving it. Section 36 provides objection rights, including an objection to direct marketing at any time.
- The NDPC’s GAID 2025, Article 18(1)(a), identifies direct marketing as processing requiring consent. Keep marketing separate from service processing; do not preselect it or make it a condition of the loyalty service.
- The Act and GAID do not establish ShopCity’s entity name, contact route, vendors, international-transfer facts, retention schedule, opt-out operations, or use of automated decisions. Those are factual Product/Legal/Engineering decisions, not copywriting gaps that should be filled by guesswork.

## Sources

1. Nigeria Data Protection Act 2023, official NDPC download: <https://ndpc.gov.ng/download/nigeria-data-protection-act-2023> (see sections 25–27, 35–36, and 46).
2. Nigeria Data Protection Commission, Nigeria Data Protection Act — General Application and Implementation Directive (GAID) 2025: <https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf> (see Article 18).
3. NDPC FAQs: <https://ndpc.gov.ng/faqs/>.

This draft does not replace review by Nigerian privacy counsel or approval by ShopCity’s accountable Product/Legal owner.
