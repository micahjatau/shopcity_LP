## ADDED Requirements

### Requirement: Supervisor customer selection opens a verified preview

When a Supervisor explicitly selects a customer search result in Manage customers or Assign card, the workflow MUST show a read-only preview only after the existing authoritative detail request returns a matching customer ID. The preview MUST clearly separate customer status from linked-card status and MUST NOT bypass existing profile or assignment eligibility controls. Its popup MUST follow the ShopCity Landing-17 treatment: a dim backdrop, centered white rounded panel, brand-red title/subtitle, and a visible top-right close control. A direct ID deep link MUST continue to load the existing workspace without automatically opening this preview.

#### Scenario: Explicit selection shows a verified preview

- **GIVEN** a Supervisor selects a customer from search results
- **WHEN** the authoritative detail response matches the selected customer ID
- **THEN** an accessible preview shows available customer name, contact details, customer status, and linked-card status/serial
- **AND** the existing profile or assignment controls remain available after the preview is dismissed.

#### Scenario: Preview links are actionable links

- **GIVEN** the selected customer has a phone number or email address
- **WHEN** the preview is displayed
- **THEN** the phone and email are rendered as `tel:` and `mailto:` links respectively
- **AND** internal card-task navigation is rendered as a real link using the selected stable customer ID.

#### Scenario: Deep links and invalid selection fail closed

- **WHEN** a customer is loaded from an ID deep link, or the selected result cannot be authoritatively verified
- **THEN** no preview is opened solely from URL data or a mismatched response
- **AND** the existing truthful detail error/empty state and write gates remain in force.

#### Scenario: Preview dismissal preserves workflow behavior

- **GIVEN** a verified preview is open
- **WHEN** the user closes it, continues, presses Escape, or dismisses the backdrop
- **THEN** the existing customer-management or card-assignment workspace remains selected
- **AND** no write is submitted merely by previewing or dismissing.
