# Admin Staff Directory and Profile

## ADDED Requirements

### Requirement: Admins can browse a Customer-style staff directory

The `/admin/users` route SHALL provide an Admin-only directory of human staff (never the internal `SYSTEM` principal) whose visual language and responsive list interactions match the Admin Customer directory. It SHALL show a staff member's name, email, phone number, role, status, branch, and a **View profile** action. Search SHALL match name, email, and phone. Status filtering SHALL support all staff statuses. The directory SHALL show loading, empty, and error/retry states and SHALL paginate its displayed results consistently with the Customer directory. The Register staff action SHALL open the dedicated registration route. The directory and nested user routes SHALL remain available through the Operations → Controls destination without adding another visible sidebar item.

#### Scenario: Admin opens the staff list

- **GIVEN** an authenticated Admin
- **WHEN** they open `/admin/users`
- **THEN** the page shows the tenant's staff in a responsive Customer-style table/list
- **AND** each row has a **View profile** link
- **AND** the page provides search, status filtering, and pagination

#### Scenario: Search and status filters narrow the directory

- **GIVEN** the staff directory has loaded
- **WHEN** the Admin searches by a staff member's name, email, or phone, or selects a status
- **THEN** only matching staff remain visible
- **AND** the current page resets to the first page when the filters change

#### Scenario: Staff list is unavailable or empty

- **WHEN** the user list request fails or returns no staff
- **THEN** the page shows a clear error with retry or a clear empty state
- **AND** it does not display placeholder or fabricated staff records

### Requirement: Admins can register staff with contact details and a selected role

The dedicated `/admin/users/new` flow SHALL collect required first name, last name, email, phone number, password, role, and branch. The UI email field SHALL map to the existing API email/username field without changing the login contract. Role choices SHALL be limited to `CASHIER`, `SUPERVISOR`, and `ADMIN`; `SYSTEM` SHALL never be assignable to a human account. Branch SHALL be selected from the authenticated tenant's branch list. Submission SHALL use the existing Admin-only, session-derived tenant provisioning API and SHALL navigate to the created profile only after a confirmed response containing its user ID. Passwords SHALL be sent only to the existing backend/Supabase Auth provisioning path; they SHALL NOT be stored in ShopCity's user table, browser storage, URLs, audit metadata, logs, or analytics.

#### Scenario: Admin completes staff registration

- **GIVEN** an authenticated Admin and available tenant branches
- **WHEN** they submit valid first name, last name, email, phone, password, role, and branch
- **THEN** the backend creates the Supabase Auth identity and tenant-scoped ShopCity user
- **AND** the ShopCity user stores the profile fields and selected role/branch
- **AND** the browser navigates to the new staff profile after the response is verified

#### Scenario: Admin chooses a role

- **GIVEN** the registration form is open
- **WHEN** the Admin selects a role
- **THEN** only `CASHIER`, `SUPERVISOR`, or `ADMIN` can be selected
- **AND** authorization continues to derive from the persisted backend role, not the form or route

#### Scenario: Registration is invalid or cannot be confirmed

- **WHEN** required fields are missing/invalid, or the backend does not confirm creation with a stable user ID
- **THEN** the form explains the problem and preserves retry-safe account state
- **AND** it does not navigate to a fabricated profile or treat an uncertain result as success

### Requirement: New staff profile fields are additive and safe for existing accounts

ShopCity SHALL persist nullable `firstName`, `lastName`, and `phoneNumber` fields on the User record so existing accounts remain valid. New staff creation SHALL require and persist all three. The email address SHALL continue to use the existing `username` identity field. User-list responses SHALL include only fields needed by the staff directory/profile and SHALL NOT expose Supabase identity IDs or password material. Staff creation audit metadata SHALL remain limited to non-contact account attributes such as role and branch, not the new contact fields or password.

#### Scenario: Existing staff lacks profile fields

- **GIVEN** a staff account created before this change
- **WHEN** it appears in the directory or profile
- **THEN** the account remains readable and manageable
- **AND** missing contact details are labeled as not provided

#### Scenario: Staff records are listed

- **GIVEN** an Admin requests the staff list
- **WHEN** the backend returns tenant-scoped staff
- **THEN** it includes profile, role, status, branch, and account timestamps needed by the UI
- **AND** it does not include `supabaseAuthId` or credential material

### Requirement: Admins can view and manage a staff profile

The `/admin/users/{userId}` route SHALL load a tenant-scoped staff profile and display name, email, phone, role, status, branch, and available account timestamps. The profile SHALL provide a return path to the staff list. Admins SHALL be able to review and update role and status using the existing role/status endpoints, explicit confirmation, and idempotency keys. The UI SHALL refresh the same profile after an update and show an accessible success/error state. The backend remains authoritative and SHALL continue revoking sessions for role changes and non-active status changes.

#### Scenario: Admin opens a staff profile

- **GIVEN** a staff member in the Admin's tenant
- **WHEN** the Admin follows **View profile** or opens the profile route directly
- **THEN** the profile displays that staff member's authoritative details and current role/status
- **AND** the profile remains tenant-scoped

#### Scenario: Admin changes role or status

- **GIVEN** an Admin reviews a staff profile
- **WHEN** they confirm a valid role or status change
- **THEN** the existing backend mutation is called with CSRF protection and an idempotency key
- **AND** the profile refreshes to show the confirmed backend values
- **AND** session revocation and audit behavior remain backend-owned

#### Scenario: Staff profile is missing or out of scope

- **WHEN** the profile route cannot find a matching tenant-scoped staff member
- **THEN** it shows a safe not-found/unavailable state and a link back to the staff directory
- **AND** it does not render details from another tenant or trust client-supplied scope
