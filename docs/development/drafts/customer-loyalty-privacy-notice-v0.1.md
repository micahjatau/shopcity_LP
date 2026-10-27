# Customer loyalty and marketing privacy notice — draft v0.1

**Status: INTERNAL REVIEW DRAFT — NOT APPROVED FOR CUSTOMER DISPLAY OR PRODUCTION USE.**

This is a plain-language starting point requested for Product/Legal review. It is not legal advice or an approved notice. Do not connect it to the registration UI or persist `v0.1` as the authoritative notice version until the accountable owner approves the wording, version, retention rules, request process, and operational facts.

## Proposed customer-facing text

> ShopCity uses the information you provide, such as your name, phone number and any email address, together with information about your ShopCity loyalty account and transactions, to create and manage your account and provide ShopCity Credit. When you register, we record your required loyalty-service choice and your separate, optional choice about marketing messages.
>
> **Marketing messages (optional):** If you choose to opt in, ShopCity may use your contact details to send you **[approved message types]** through **[approved channels]**. This choice is optional and is not required to register for the loyalty service. **[Add the approved opt-out method and any applicable timing.]**
>
> **Who is responsible for your information:** [Insert approved legal entity/controller name and contact details.]
>
> **How long we keep information:** [Insert the approved retention period or criteria, mapped to the actual retention/deletion process.]
>
> **Service providers or transfers:** [Insert approved categories of recipients, service providers, and any applicable transfer information.]
>
> **Questions or privacy requests:** [Insert the approved contact/channel and the request types and process the business can support.]
>
> Notice version: [Insert approved version identifier and effective date.]

## Items requiring owner confirmation

- Exact legal entity/controller and privacy contact.
- Whether the listed account, purchase, loyalty, consent, and optional contact data categories are complete and accurate.
- Permitted marketing purposes, message types, delivery channels, opt-out method, and whether these choices are honored by every sender/provider path.
- Approved retention schedule/criteria and matching deletion, export, and legal-hold behavior. No retention duration or export/deletion promise is made in this draft.
- Service-provider/recipient and transfer disclosures, if applicable.
- Authoritative notice version and effective date, and how that version will be displayed and stored with consent evidence.
- Product/Legal approval before customer display or production use.

## Current implementation caveat

The registration API currently records loyalty consent, marketing opt-in, and server-owned consent/privacy version constants. The UI currently contains specific retention/export/deletion wording, but the closure work treats those statements as provisional pending owner verification. This draft does not validate or replace that runtime copy, and is not evidence that the persisted version constants correspond to approved text.
