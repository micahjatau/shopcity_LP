# Supervisor Overview Specification

## Purpose

Define the Supervisor landing route as a compact, greeting-led entry point while keeping operational work on dedicated routes.

## ADDED Requirements

### Requirement: Supervisor overview stays focused

The `/supervisor` route MUST present a role-accurate greeting and concise welcome copy without duplicating shell navigation or embedding operational workflows. The existing shell navigation and dedicated Supervisor routes MUST remain available and unchanged.

#### Scenario: Supervisor opens the overview

- **WHEN** an authorized Supervisor opens `/supervisor`
- **THEN** the page presents one level-one heading with the greeting `Hi, Supervisor!`
- **AND** presents concise welcome copy matching the cashier overview's tone
- **AND** does not render route-launch cards, overview guide/review cards, approval or fraud workspaces, or the reports workspace
- **AND** preserves the shared shell navigation and its current route destinations
- **AND** preserves the existing scanner lookup context

#### Scenario: Supervisor opens an operational workspace

- **WHEN** a Supervisor navigates to the dedicated approvals, fraud, reports, customer, card, or transaction route
- **THEN** that route retains its existing workflow, role authorization, and server-authoritative behavior
- **AND** simplifying `/supervisor` does not remove operational functionality from those routes.
