# money-input-grammar Specification

## ADDED Requirements

### Requirement: Money input uses an explicit Nigerian currency grammar

The system MUST parse and format money input with an explicit Nigerian currency grammar that preserves integer kobo accuracy.

#### Scenario: Comma separated whole numbers remain whole amounts

- **WHEN** a user enters `1,234`
- **THEN** the parser treats the value as one thousand two hundred thirty-four naira, not as a decimal amount

#### Scenario: Excess precision is rejected

- **WHEN** a user enters more than two decimal places
- **THEN** the parser rejects the value instead of silently rounding it

#### Scenario: Pasted formatted currency is handled safely

- **WHEN** a user pastes a formatted naira string such as `₦1,234.50`
- **THEN** the system parses it deterministically and preserves the original kobo value

### Requirement: Money display preserves sign and amount semantics

The system MUST format money output without changing the signed amount or masking negative values as positive.

#### Scenario: Negative amounts remain negative when signed output is expected

- **WHEN** a negative amount is rendered in a signed context
- **THEN** the display keeps the negative sign and the accessible label matches the rendered value
