## ADDED Requirements

### Requirement: Meeting creation writes org_unit_id

The system SHALL write `org_unit_id` when creating a meeting. The POST `/api/meetings` endpoint SHALL accept `org_unit_id` in the request body and include it in the INSERT statement. The frontend meeting page SHALL pass `selectedSubsidiaryId` as `org_unit_id` when calling `createMeeting()`.

#### Scenario: Create meeting with subsidiary attribution

- **WHEN** a user creates a meeting with the subsidiary dropdown set to "org-sub-1"
- **THEN** the created meeting record in the database SHALL have `org_unit_id = 'org-sub-1'`

#### Scenario: Create meeting without subsidiary selection

- **WHEN** a user creates a meeting with no subsidiary selected (dropdown shows "all")
- **THEN** the created meeting record SHALL have `org_unit_id = NULL`

### Requirement: Meeting update writes org_unit_id

The system SHALL write `org_unit_id` when updating a meeting. The PUT `/api/meetings/:id` endpoint SHALL accept `org_unit_id` in the request body and include it in the UPDATE statement.

#### Scenario: Update meeting org_unit_id

- **WHEN** a PUT request is made to `/api/meetings/:id` with `org_unit_id = 'org-sub-2'`
- **THEN** the meeting record SHALL be updated with `org_unit_id = 'org-sub-2'`

### Requirement: Talent pool creation writes org_unit_id

The system SHALL write `org_unit_id` when adding a talent pool entry. The POST `/api/talent-pool` endpoint SHALL accept `org_unit_id` in the request body and include it in the INSERT statement.

#### Scenario: Add talent with subsidiary attribution

- **WHEN** a user adds a talent to the pool with subsidiary set to "org-sub-1"
- **THEN** the talent_pool record SHALL have `org_unit_id = 'org-sub-1'`

### Requirement: Talent pool update writes org_unit_id

The system SHALL write `org_unit_id` when updating a talent pool entry. The PUT `/api/talent-pool/:id` endpoint SHALL accept `org_unit_id` in the request body and include it in the UPDATE statement.

#### Scenario: Update talent pool org_unit_id

- **WHEN** a PUT request is made to `/api/talent-pool/:id` with `org_unit_id = 'org-sub-2'`
- **THEN** the talent_pool record SHALL be updated with `org_unit_id = 'org-sub-2'`

### Requirement: Apply-to-job inherits org_unit_id from job

The system SHALL inherit `org_unit_id` from the target job when a talent pool candidate applies to a job. The POST `/api/talent-pool/:id/apply-to-job` endpoint SHALL query the job's `org_unit_id` and assign it to the created candidate record.

#### Scenario: Talent applies to job with subsidiary

- **WHEN** a talent pool candidate applies to a job that has `org_unit_id = 'org-sub-1'`
- **THEN** the created candidate record SHALL have `org_unit_id = 'org-sub-1'`

### Requirement: Import to talent pool inherits org_unit_id from job

The system SHALL inherit `org_unit_id` from the candidate's associated job when importing a candidate to the talent pool. The `importToTalentPool()` function SHALL query the job's `org_unit_id` and include it in the talent_pool INSERT statement.

#### Scenario: Import candidate to talent pool with job subsidiary

- **WHEN** a candidate associated with a job having `org_unit_id = 'org-sub-1'` is imported to the talent pool
- **THEN** the talent_pool record SHALL have `org_unit_id = 'org-sub-1'`

### Requirement: Job creation writes org_unit_id from frontend

The frontend job service `createJob()` method SHALL include `org_unit_id` in the POST request payload. The jobs page SHALL pass `selectedSubsidiaryId` or `modalSubsidiaryId` as `org_unit_id` when creating a job.

#### Scenario: Create job with subsidiary from page

- **WHEN** a user creates a job with the subsidiary dropdown set to "org-sub-1"
- **THEN** the POST request payload SHALL include `org_unit_id: 'org-sub-1'`

### Requirement: Job update writes org_unit_id

The backend PUT `/api/jobs/:id` endpoint SHALL accept `org_unit_id` in the request body. If present, the UPDATE statement SHALL set `org_unit_id` to the provided value.

#### Scenario: Update job org_unit_id

- **WHEN** a PUT request is made to `/api/jobs/:id` with `org_unit_id = 'org-sub-2'`
- **THEN** the job record SHALL be updated with `org_unit_id = 'org-sub-2'`

### Requirement: Grade tracks applyCreate writes org_unit_id

The `applyCreate` function in grade-matrix.js SHALL include `org_unit_id` when inserting a new grade_tracks record. The value SHALL be extracted from `JSON.parse(change.new_data).org_unit_id`.

#### Scenario: Create grade track with org_unit_id via approval

- **WHEN** a grade track change request with `org_unit_id = 'org-sub-1'` in `new_data` is approved
- **THEN** the inserted grade_tracks record SHALL have `org_unit_id = 'org-sub-1'`

### Requirement: Grade tracks applyUpdate writes org_unit_id

The `applyUpdate` function in grade-matrix.js SHALL include `org_unit_id` in the UPDATE SET clause when updating a grade_tracks record.

#### Scenario: Update grade track org_unit_id via approval

- **WHEN** a grade track update change request with `org_unit_id = 'org-sub-2'` in `new_data` is approved
- **THEN** the updated grade_tracks record SHALL have `org_unit_id = 'org-sub-2'`

### Requirement: Grade tracks DB migration

The system SHALL add an `org_unit_id TEXT` column to the `grade_tracks` table during tenant database migration. The migration SHALL be idempotent (using try-catch for ALTER TABLE) and SHALL create an index `idx_gt_org_unit` on the new column.

#### Scenario: Migration adds org_unit_id to grade_tracks

- **WHEN** the tenant database migration runs
- **THEN** the `grade_tracks` table SHALL have an `org_unit_id` column and an `idx_gt_org_unit` index
