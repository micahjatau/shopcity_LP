# Shared Shell Footer Branding Specification

## Purpose

Define the visible attribution in the shared desktop and mobile navigation footers.

## ADDED Requirements

### Requirement: Show Radar Solutions attribution in shell footers

The desktop sidebar footer and mobile navigation drawer footer MUST display the exact text `Powered by Radar Solutions` instead of branch name and timezone metadata. This presentation change MUST NOT alter branch context used for authorization or business logic, or change shell navigation behavior.

#### Scenario: Desktop shell footer

- **WHEN** an authenticated user views the desktop shell sidebar
- **THEN** the footer displays `Powered by Radar Solutions`
- **AND** it does not display the current branch name or timezone.

#### Scenario: Mobile navigation footer

- **WHEN** an authenticated user opens the mobile navigation drawer
- **THEN** the footer displays `Powered by Radar Solutions`
- **AND** it does not display separate branch-name or timezone labels.
