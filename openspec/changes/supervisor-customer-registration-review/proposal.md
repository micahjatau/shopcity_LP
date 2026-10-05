# Proposal: Supervisor customer registration review

## Summary

Move the confirmation step from selecting an existing customer to the consequential creation of a new customer and their first loyalty card. Supervisor registration becomes local validation → review → atomic create → confirmed success. Selecting a customer in Manage customers or Assign card loads the authoritative details directly, without the old shared customer-preview modal.

## Context

The Supervisor Register customer form currently sends `POST /api/v1/customers` immediately. The separate `CustomerRegistrationFlow` already demonstrates a review stage, while `ManageCustomers` and `SupervisorCardAssignment` both interpose `SupervisorCustomerPreviewDialog` after verified customer selection. Existing card assignment already has a distinct review of the selected customer and new serial before its write.

This change supersedes the completed `supervisor-customer-selection-preview` interaction: existing-customer selection should reveal details, not ask the operator to confirm identity in a modal. Confirmation belongs immediately before creating a new customer and first card.

## Scope

- Change the Supervisor registration form action to **Review details**; perform local required-field and loyalty-consent validation without an API request.
- Show an accessible, compact `CustomerRegistrationReviewDialog` containing only customer name, phone, email (or “Not provided”), and initial card serial, with **Edit details** and **Register customer** actions.
- Only **Register customer** in that dialog may call the existing create endpoint. Preserve the required loyalty consent, optional marketing choice, CSRF/idempotency behavior, and atomic customer + initial-card + consent transaction.
- On a verified `201` response with customer ID, close the dialog and show a success card with **Register another customer** and **View customer** linking to the stable-ID Manage customers route.
- Remove the old shared selection-preview dialog from Manage customers and Assign card. Both routes continue to require deliberate selection and authoritative ID-matched detail loading; show the selected details/eligibility inline immediately. Preserve the assignment serial review before card creation.

## Non-goals

- No API/OpenAPI/generated-client, database, consent-copy/version, RBAC, tenant-scope, card lifecycle, or idempotency-contract changes.
- No change to the customer profile/status editing controls or card-assignment eligibility rules.
- Do not report success or consent capture unless the create response is confirmed.
- Do not show customer/card statuses, linked-card context, card-management links, or existing-customer actions in the pre-registration review dialog.
