## ADDED Requirements

### Requirement: Meeting creation writes department

The system SHALL write `department` when creating a meeting. The POST `/api/meetings` endpoint SHALL accept `department` in the request body and include it in the INSERT statement. The frontend meeting page SHALL pass the selected department value from the modal form as `department` when calling `saveMeeting()`.

#### Scenario: Create meeting with department attribution

- **WHEN** a user creates a meeting with the department field set to "Engineering"
- **THEN** the created meeting record in the database SHALL have `department = 'Engineering'`

#### Scenario: Create meeting without department selection

- **WHEN** a user creates a meeting with no department selected
- **THEN** the created meeting record SHALL have `department = NULL`

### Requirement: Meeting update writes department

The system SHALL write `department` when updating a meeting. The PUT `/api/meetings/:id` endpoint SHALL accept `department` in the request body and include it in the UPDATE statement.

#### Scenario: Update meeting department

- **WHEN** a PUT request is made to `/api/meetings/:id` with `department = 'Sales'`
- **THEN** the meeting record SHALL be updated with `department = 'Sales'`

### Requirement: Meeting modal ownership fields

The add/edit meeting modal SHALL display subsidiary and department fields in the basic information section. The subsidiary dropdown SHALL list all available subsidiaries from `OrgUnitService`. The department dropdown SHALL cascade from the selected subsidiary, showing only departments belonging to the chosen subsidiary. The selected values SHALL be stored in the `newMeeting` signal as `org_unit_id` and `department`.

#### Scenario: User sets meeting ownership in modal

- **WHEN** the user selects a subsidiary and department in the meeting modal form
- **THEN** the `newMeeting` signal SHALL contain the corresponding `org_unit_id` and `department` values

#### Scenario: Department cascades from subsidiary in modal

- **WHEN** the user changes the subsidiary selection in the meeting modal
- **THEN** the department dropdown SHALL update to show only departments under the selected subsidiary

### Requirement: Meetings table department column migration

The system SHALL add a `department TEXT` column to the `meetings` table during tenant database migration. The migration SHALL be idempotent (using try-catch for ALTER TABLE).

#### Scenario: Migration adds department to meetings

- **WHEN** the tenant database migration runs
- **THEN** the `meetings` table SHALL have a `department` column

### Requirement: Meetings table org_unit_id migration fix

The system SHALL include `meetings` in the `subsidiaryMigrations` array in tenant-schema.js to add the `org_unit_id TEXT` column and create an `idx_meeting_org_unit` index. This corrects a missing migration entry.

#### Scenario: Migration adds org_unit_id to meetings

- **WHEN** the tenant database migration runs
- **THEN** the `meetings` table SHALL have an `org_unit_id` column and an `idx_meeting_org_unit` index

### Requirement: Meeting model includes department field

The frontend `Meeting` TypeScript interface SHALL include a `department` optional string field (`department?: string`). This field SHALL be used to display and submit meeting department attribution.

#### Scenario: Meeting interface has department field

- **WHEN** a meeting object is created or received from the API
- **THEN** the `Meeting` interface SHALL accept an optional `department` string property
