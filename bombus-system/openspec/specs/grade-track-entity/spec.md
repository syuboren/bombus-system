# grade-track-entity Specification

## Purpose

TBD - created by archiving change 'grade-matrix-edit-redesign'. Update Purpose after archive.

## Requirements

### Requirement: Grade track entries store track-specific attributes independently

Each grade level SHALL have independent track entries for management and professional tracks. Each track entry SHALL contain its own title, education requirement, and responsibility description. A grade level SHALL NOT share education or responsibility fields across tracks.

#### Scenario: Grade level has two independent track entries

- **WHEN** a grade level (e.g., Grade 3) exists in the system
- **THEN** it SHALL have exactly two track entries: one with track="management" and one with track="professional", each with independent title, education_requirement, and responsibility_description values

#### Scenario: Grade exceeding a track's max grade has an empty track entry

- **WHEN** a grade level exceeds a track's maximum grade (e.g., Grade 7 exceeds professional track's maxGrade of 6)
- **THEN** the system SHALL still create a track entry for that track with an empty title
- **THEN** the UI SHALL NOT display the empty track entry in the track timeline, controlled by `grade_tracks.maxGrade`

#### Scenario: Track entries have different content per track

- **WHEN** Grade 3 has a management track entry with title="Deputy Manager" and education="Bachelor's degree or above"
- **THEN** the professional track entry for Grade 3 SHALL be able to have a different title (e.g., "Senior Engineer") and different education requirement (e.g., "Bachelor's in related field")

---
### Requirement: Track entry CRUD operations with change approval

The system SHALL support creating, reading, updating, and deleting grade track entries. All CUD operations SHALL create a change record with status "pending" and SHALL NOT apply directly to the data until approved.

#### Scenario: Create track entry for a grade

- **WHEN** an authorized user creates a new track entry with grade=3, track="management", title="Deputy Manager"
- **THEN** the system SHALL create a change record with entity_type="track-entry", action="create", status="pending"
- **THEN** the track entry SHALL NOT be visible in the grade matrix until approved

#### Scenario: Update track entry education requirement

- **WHEN** an authorized user updates the education_requirement of an existing management track entry for Grade 3
- **THEN** the system SHALL create a change record with old_data containing the previous values and new_data containing the updated values
- **THEN** the change record status SHALL be "pending"

#### Scenario: Delete track entry

- **WHEN** an authorized user deletes a track entry
- **THEN** the system SHALL create a change record with action="delete" and old_data containing the current values
- **THEN** the track entry SHALL remain in the system until the deletion is approved

---
### Requirement: Grade creation automatically creates both track entries

When a new grade level is created, the system SHALL automatically create two track entries — one for management and one for professional. The user SHALL provide track-specific attributes (title, education, responsibility) for each track during grade creation.

#### Scenario: New grade creates both track entries

- **WHEN** a user creates Grade 8 with management title="Vice President" and professional title="Principal Engineer"
- **THEN** the system SHALL create one grade_levels record AND two grade_track_entries records (management + professional)
- **THEN** all three records SHALL be part of the same change approval flow

---
### Requirement: API returns track entries nested within grade levels

The GET grade matrix API SHALL return track entries as a nested array within each grade level object, replacing the previous flat titleManagement/titleProfessional/educationRequirement/responsibilityDescription fields.

#### Scenario: GET grade matrix response format

- **WHEN** a client requests GET /api/grade-matrix
- **THEN** each grade level object SHALL contain a `trackEntries` array with objects containing: id, grade, track, title, educationRequirement, responsibilityDescription
- **THEN** the response SHALL NOT contain titleManagement, titleProfessional, educationRequirement, or responsibilityDescription at the grade level

---
### Requirement: Track entries respect org_unit_id isolation

Grade track entries SHALL support multi-tenant subsidiary isolation through the org_unit_id field. Queries SHALL filter by org_unit_id when provided.

#### Scenario: Filter track entries by subsidiary

- **WHEN** a user with org_unit_id="sub-001" requests the grade matrix
- **THEN** the system SHALL return only track entries where org_unit_id matches "sub-001" or is NULL

---
### Requirement: Side panel editing with matrix context

The grade matrix editing interface SHALL use a side panel instead of a modal dialog. The matrix view SHALL remain visible while the side panel is open, and the currently edited grade card SHALL be visually highlighted.

#### Scenario: Open side panel for editing

- **WHEN** a user clicks the edit icon on a grade card while in edit mode
- **THEN** a side panel SHALL slide in from the right side
- **THEN** the grade matrix SHALL remain visible on the left
- **THEN** the selected grade card SHALL be visually highlighted (e.g., bold border)

#### Scenario: Side panel contains track tabs

- **WHEN** the side panel is open for editing Grade 3
- **THEN** the panel SHALL display shared grade info (grade number, code range, salary levels) at the top
- **THEN** the panel SHALL display two tabs: "Management Track" and "Professional Track"
- **THEN** each tab SHALL show the track-specific fields: title, education requirement, responsibility description

#### Scenario: Close side panel

- **WHEN** a user clicks the close button or saves successfully
- **THEN** the side panel SHALL slide out
- **THEN** the matrix SHALL return to full width
- **THEN** no grade card SHALL be highlighted

---
### Requirement: Edit mode toggle for read-heavy usage

The grade matrix page SHALL have an edit mode toggle. By default, the page SHALL be in read-only browsing mode. Edit icons and the "Add Grade" button SHALL only be visible when edit mode is active.

#### Scenario: Default read-only mode

- **WHEN** a user navigates to the grade matrix page
- **THEN** no edit icons SHALL be visible on grade cards
- **THEN** no "Add Grade" button SHALL be visible

#### Scenario: Activate edit mode

- **WHEN** a user toggles the edit mode switch
- **THEN** edit icons SHALL appear on each grade card
- **THEN** an "Add Grade" button SHALL appear at the bottom of the matrix

#### Scenario: New grade creation shows existing grades context

- **WHEN** a user clicks "Add Grade" while in edit mode
- **THEN** the side panel SHALL open with an empty form
- **THEN** the matrix SHALL continue showing all existing grades, providing visual context for what grade numbers already exist

---
### Requirement: Data migration from shared fields to track entries

Existing grade level data with shared education_requirement and responsibility_description fields SHALL be migrated to independent track entries. The migration SHALL be idempotent.

#### Scenario: Migrate existing grade data

- **WHEN** the migration script runs on a database with existing grade_levels containing title_management and title_professional
- **THEN** for each grade level, two grade_track_entries records SHALL be created
- **THEN** the management entry SHALL copy title_management as title, and the shared education_requirement and responsibility_description
- **THEN** the professional entry SHALL copy title_professional as title, and the shared education_requirement and responsibility_description

#### Scenario: Idempotent migration

- **WHEN** the migration script runs a second time on the same database
- **THEN** no duplicate track entries SHALL be created
- **THEN** existing track entries SHALL remain unchanged
