# Public business landing page

## Requirements

### Requirement: Present public ShopCity business information

The system SHALL present a public homepage explaining ShopCity's merchant loyalty platform and its intended business customers.

#### Scenario: Visitor opens homepage

- **WHEN** a visitor opens `/` without signing in
- **THEN** they see a concise value proposition, a contact/demo action, and ShopCity business contact and physical address details

### Requirement: Preserve application entry points

The system SHALL retain login and authenticated operational routes while the homepage becomes public-facing.

#### Scenario: Visitor navigates to sign in

- **WHEN** a visitor selects the login action
- **THEN** the existing login route remains available
