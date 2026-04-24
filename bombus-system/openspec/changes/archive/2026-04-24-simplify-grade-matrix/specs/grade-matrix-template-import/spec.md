## ADDED Requirements

### Requirement: Org-unit-bound grade salary data

All grade salary data (salary levels, track entries, promotion criteria, department positions) SHALL be bound to an explicit `org_unit_id`. The system MUST NOT allow `org_unit_id = NULL` for these records. Each org unit (group or subsidiary) SHALL maintain its own independent dataset.

#### Scenario: Query grade matrix for a specific org unit

- **WHEN** a user requests grade matrix data for org_unit_id = "subsidiary-x"
- **THEN** the system SHALL return only records where `org_unit_id = "subsidiary-x"`, with no fallback to group-level defaults

#### Scenario: Org unit has no grade salary data

- **WHEN** a user requests grade matrix data for an org unit that has no salary level records
- **THEN** the system SHALL return an empty dataset (not fall back to another org unit's data)

### Requirement: Template import from parent company

The system SHALL provide an API endpoint `POST /api/grade-matrix/import-template` that copies the complete grade salary dataset from a source org unit to a target org unit. The copy SHALL include salary levels, track entries, promotion criteria, and department positions.

#### Scenario: Successful template import

- **WHEN** an admin calls the import API with a valid `source_org_unit_id` and `target_org_unit_id`, and the target org unit has no existing grade salary data
- **THEN** the system SHALL copy all grade salary levels, track entries, promotion criteria, and department positions from the source to the target, generating new IDs for each record and replacing `org_unit_id` with the target value
- **AND** the operation SHALL be atomic (all-or-nothing via database transaction)
- **AND** the response SHALL include counts of imported records per category

#### Scenario: Target org unit already has data

- **WHEN** an admin calls the import API and the target org unit already has one or more salary level records
- **THEN** the system SHALL reject the request with HTTP 400 and a message indicating the target already has data

#### Scenario: Source org unit has no data

- **WHEN** an admin calls the import API and the source org unit has no salary level records
- **THEN** the system SHALL reject the request with HTTP 400 and a message indicating the source has no data to copy

### Requirement: Remove salary code cascade logic

The system SHALL NOT automatically shift salary codes across grades when salary levels are added or removed. Each org unit's salary codes SHALL be managed independently by the administrator.

#### Scenario: Adding salary levels to a grade

- **WHEN** an admin adds salary levels to grade 3 for org_unit "subsidiary-x"
- **THEN** the system SHALL insert the records for grade 3 only, without modifying salary codes of grades 4, 5, 6, or 7

#### Scenario: Deleting salary levels from a grade

- **WHEN** an admin removes salary levels from grade 2 for org_unit "subsidiary-x"
- **THEN** the system SHALL delete only the specified records, without modifying salary codes of any other grade

### Requirement: Frontend empty state with template import action

The grade matrix page SHALL display an empty state with a template import button when the selected org unit has no grade salary data.

#### Scenario: Subsidiary with no data views grade matrix

- **WHEN** an admin navigates to the grade matrix page and selects a subsidiary that has no salary level records
- **THEN** the page SHALL display an empty state message and a "從母公司帶入範本" (Import from parent company) button

#### Scenario: Admin clicks import template button

- **WHEN** an admin clicks the "從母公司帶入範本" button
- **THEN** the system SHALL call the import template API using the group org unit as the source and the selected subsidiary as the target
- **AND** on success, the page SHALL reload and display the imported data with a success notification

#### Scenario: Parent company has no data

- **WHEN** the group org unit has no salary level data
- **THEN** the import template button SHALL be disabled with a tooltip indicating "母公司尚未設定職等薪資"

### Requirement: Data migration for existing NULL records

Upon tenant database initialization, the system SHALL migrate all existing records with `org_unit_id = NULL` to the group-level org unit ID. This migration SHALL run once and be idempotent.

#### Scenario: Existing tenant with NULL salary data

- **WHEN** a tenant database is loaded and contains `grade_salary_levels` records with `org_unit_id = NULL`
- **THEN** the system SHALL update those records to set `org_unit_id` to the group org unit's ID
- **AND** the same migration SHALL apply to `grade_track_entries`, `promotion_criteria`, and `department_positions`

#### Scenario: Migration runs on already-migrated data

- **WHEN** the migration runs on a tenant where all records already have a non-NULL `org_unit_id`
- **THEN** no records SHALL be modified (idempotent)
