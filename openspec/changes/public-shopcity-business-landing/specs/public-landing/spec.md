# Public business landing page

## ADDED Requirements

### Requirement: Present public ShopCity business information

The system SHALL present a public homepage explaining ShopCity's merchant loyalty platform and its intended business customers.

#### Scenario: Visitor opens homepage

- **WHEN** a visitor opens `/` without signing in
- **THEN** they see a concise value proposition, a contact/demo action, and a virtual-card preview styled like the customer-profile card
- **AND** the red branded header keeps the white ShopCity logo and navigation legible
- **AND** business identity, contact details, and the physical address appear together once in the navy contact section, which contains the rights-reserved notice without a duplicate lower address

### Requirement: Preserve application entry points

The system SHALL retain login and authenticated operational routes while the homepage becomes public-facing.

#### Scenario: Visitor navigates to sign in

- **WHEN** a visitor selects the login action
- **THEN** the existing login route remains available
